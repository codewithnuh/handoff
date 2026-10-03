import { AsyncLocalStorage } from "node:async_hooks";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/prisma";
import {
  addDeliverableVersion,
  deleteDeliverable,
  updateDeliverable,
} from "@/lib/actions/deliverable";
import {
  clientApproveDeliverable,
  clientRequestChanges,
} from "@/lib/actions/portal-actions";
import { setSubjectAdapters } from "@/lib/access";
import { fixtureIds, seedIntegrationFixtures } from "./fixtures";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

type TestActor =
  | { kind: "user"; userId: string }
  | { kind: "client"; email: string };

const actorContext = new AsyncLocalStorage<TestActor>();
let restoreSubjects: (() => void) | undefined;
let deliverableCounter = 0;

function asUser<T>(userId: string, action: () => Promise<T>) {
  return actorContext.run({ kind: "user", userId }, action);
}

function asClient<T>(email: string, action: () => Promise<T>) {
  return actorContext.run({ kind: "client", email }, action);
}

function startTogether<const T extends readonly (() => Promise<unknown>)[]>(
  actions: T,
): Promise<{ [K in keyof T]: Awaited<ReturnType<T[K]>> }> {
  let waiting = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });

  return Promise.all(
    actions.map(async (action) => {
      waiting += 1;
      if (waiting === actions.length) release();
      await gate;
      return action();
    }),
  ) as Promise<{ [K in keyof T]: Awaited<ReturnType<T[K]>> }>;
}

async function createReviewDeliverable(
  status: "DRAFT" | "IN_REVIEW" | "CHANGES_REQUESTED" = "IN_REVIEW",
) {
  const id = `itest_cod84_deliverable_${++deliverableCounter}`;
  return db.deliverable.create({
    data: {
      id,
      projectId: fixtureIds.projectA,
      title: `COD-84 review ${deliverableCounter}`,
      status,
      version: 1,
    },
  });
}

beforeAll(async () => {
  await seedIntegrationFixtures(db);
  await db.workspaceMember.createMany({
    data: [
      {
        id: "itest_workspace_lead",
        workspaceId: fixtureIds.workspaceA,
        userId: fixtureIds.lead,
        role: "MEMBER",
      },
      {
        id: "itest_workspace_contributor",
        workspaceId: fixtureIds.workspaceA,
        userId: fixtureIds.contributor,
        role: "MEMBER",
      },
      {
        id: "itest_workspace_observer",
        workspaceId: fixtureIds.workspaceA,
        userId: fixtureIds.observer,
        role: "MEMBER",
      },
    ],
    skipDuplicates: true,
  });
  await db.user.updateMany({
    where: {
      id: { in: [fixtureIds.lead, fixtureIds.contributor, fixtureIds.observer] },
    },
    data: { activeWorkspaceId: fixtureIds.workspaceA },
  });
  restoreSubjects = setSubjectAdapters({
    getUser: async () => {
      const actor = actorContext.getStore();
      if (actor?.kind !== "user") return null;
      return db.user.findUnique({ where: { id: actor.userId } });
    },
    getClient: async () => {
      const actor = actorContext.getStore();
      return actor?.kind === "client"
        ? { sessionId: "itest_cod84_portal_session", email: actor.email }
        : null;
    },
  });
});

afterAll(() => restoreSubjects?.());

describe("deliverable review concurrency against PostgreSQL", () => {
  it("allows only one winner when approval races an edit from the same version", async () => {
    const deliverable = await createReviewDeliverable();
    const [approval, edit] = await startTogether([
      () =>
        asClient("shared@example.test", () =>
          clientApproveDeliverable({
            deliverableId: deliverable.id,
            expectedVersion: deliverable.version,
          }),
        ),
      () =>
        asUser(fixtureIds.ownerA, () =>
          updateDeliverable({
            id: deliverable.id,
            title: "Freelancer edit",
            expectedVersion: deliverable.version,
          }),
        ),
    ] as const);

    const results = [approval, edit];
    expect(results.filter((result) => result.success)).toHaveLength(1);
    expect(
      results.filter((result) => !result.success && result.error.code === "CONFLICT"),
    ).toHaveLength(1);

    const saved = await db.deliverable.findUniqueOrThrow({
      where: { id: deliverable.id },
    });
    expect(saved.version).toBe(2);
    expect(
      saved.status === "APPROVED" || saved.title === "Freelancer edit",
    ).toBe(true);
    if (saved.status === "APPROVED") expect(saved.title).toBe(deliverable.title);
  });

  it("allocates one new version for concurrent uploads from the same view", async () => {
    const deliverable = await createReviewDeliverable();
    await db.deliverableVersion.create({
      data: {
        id: `${deliverable.id}_v1`,
        deliverableId: deliverable.id,
        versionNumber: 1,
        notes: "Initial review version",
      },
    });

    const uploads = await startTogether([
      () =>
        asUser(fixtureIds.ownerA, () =>
          addDeliverableVersion({
            deliverableId: deliverable.id,
            expectedVersion: deliverable.version,
            notes: "First concurrent upload",
          }),
        ),
      () =>
        asUser(fixtureIds.ownerA, () =>
          addDeliverableVersion({
            deliverableId: deliverable.id,
            expectedVersion: deliverable.version,
            notes: "Second concurrent upload",
          }),
        ),
    ] as const);

    expect(uploads.filter((result) => result.success), JSON.stringify(uploads)).toHaveLength(1);
    expect(
      uploads.filter((result) => !result.success && result.error.code === "CONFLICT"),
    ).toHaveLength(1);
    const [savedDeliverable, versions] = await Promise.all([
      db.deliverable.findUniqueOrThrow({ where: { id: deliverable.id } }),
      db.deliverableVersion.findMany({
        where: { deliverableId: deliverable.id },
        orderBy: { versionNumber: "asc" },
      }),
    ]);
    expect(savedDeliverable.version).toBe(2);
    expect(versions.map((version) => version.versionNumber)).toEqual([1, 2]);
  });

  it("returns CONFLICT for stale edits and preserves the winning content", async () => {
    const deliverable = await createReviewDeliverable("DRAFT");
    const first = await asUser(fixtureIds.contributor, () =>
      updateDeliverable({
        id: deliverable.id,
        title: "Saved draft",
        expectedVersion: deliverable.version,
      }),
    );
    const stale = await asUser(fixtureIds.contributor, () =>
      updateDeliverable({
        id: deliverable.id,
        title: "Stale overwrite",
        expectedVersion: deliverable.version,
      }),
    );

    expect(first.success, JSON.stringify(first)).toBe(true);
    expect(stale).toMatchObject({
      success: false,
      error: { code: "CONFLICT" },
    });
    const saved = await db.deliverable.findUniqueOrThrow({
      where: { id: deliverable.id },
    });
    expect(saved).toMatchObject({ title: "Saved draft", version: 2 });
  });

  it("keeps freelancer capabilities aligned with draft and review transitions", async () => {
    const deliverable = await createReviewDeliverable("DRAFT");
    const contributorSubmit = await asUser(fixtureIds.contributor, () =>
      updateDeliverable({
        id: deliverable.id,
        status: "IN_REVIEW",
        expectedVersion: 1,
      }),
    );
    const observerEdit = await asUser(fixtureIds.observer, () =>
      updateDeliverable({
        id: deliverable.id,
        title: "Observer edit",
        expectedVersion: 1,
      }),
    );
    expect(contributorSubmit, JSON.stringify(contributorSubmit)).toMatchObject({
      success: false,
      error: { code: "FORBIDDEN" },
    });
    expect(observerEdit, JSON.stringify(observerEdit)).toMatchObject({
      success: false,
      error: { code: "FORBIDDEN" },
    });

    const leadSubmit = await asUser(fixtureIds.lead, () =>
      updateDeliverable({
        id: deliverable.id,
        status: "IN_REVIEW",
        expectedVersion: 1,
      }),
    );
    expect(leadSubmit.success).toBe(true);
    if (!leadSubmit.success) return;

    const portalChanges = await asClient("shared@example.test", () =>
      clientRequestChanges({
        deliverableId: deliverable.id,
        expectedVersion: leadSubmit.data.version,
        comment: "Please adjust the opening slide.",
      }),
    );
    expect(portalChanges.success).toBe(true);
    if (!portalChanges.success) return;

    const leadResubmit = await asUser(fixtureIds.lead, () =>
      updateDeliverable({
        id: deliverable.id,
        status: "IN_REVIEW",
        expectedVersion: portalChanges.data.newVersion,
      }),
    );
    expect(leadResubmit.success).toBe(true);
    const saved = await db.deliverable.findUniqueOrThrow({
      where: { id: deliverable.id },
    });
    expect(saved.status).toBe("IN_REVIEW");
    expect(saved.version).toBe(4);
  });

  it("commits feedback with the request-changes transition and rejects stale feedback", async () => {
    const deliverable = await createReviewDeliverable();
    const request = await asClient("shared@example.test", () =>
      clientRequestChanges({
        deliverableId: deliverable.id,
        expectedVersion: deliverable.version,
        comment: "The footer needs revision.",
      }),
    );
    expect(request.success).toBe(true);
    const stale = await asClient("shared@example.test", () =>
      clientRequestChanges({
        deliverableId: deliverable.id,
        expectedVersion: deliverable.version,
        comment: "This stale feedback must not persist.",
      }),
    );

    expect(stale).toMatchObject({
      success: false,
      error: { code: "CONFLICT" },
    });
    const [saved, comments] = await Promise.all([
      db.deliverable.findUniqueOrThrow({ where: { id: deliverable.id } }),
      db.comment.findMany({ where: { deliverableId: deliverable.id } }),
    ]);
    expect(saved).toMatchObject({ status: "CHANGES_REQUESTED", version: 2 });
    expect(comments.map((comment) => comment.content)).toEqual([
      "The footer needs revision.",
    ]);
  });

  it("rejects draft approvals and keeps approved content immutable", async () => {
    const draft = await createReviewDeliverable("DRAFT");
    const draftApproval = await asClient("shared@example.test", () =>
      clientApproveDeliverable({
        deliverableId: draft.id,
        expectedVersion: draft.version,
      }),
    );
    expect(draftApproval, JSON.stringify(draftApproval)).toMatchObject({
      success: false,
      error: { code: "INVALID_STATUS" },
    });

    const submitted = await createReviewDeliverable();
    const approval = await asClient("shared@example.test", () =>
      clientApproveDeliverable({
        deliverableId: submitted.id,
        expectedVersion: submitted.version,
      }),
    );
    expect(approval.success).toBe(true);
    if (!approval.success) return;

    const edit = await asUser(fixtureIds.lead, () =>
      updateDeliverable({
        id: submitted.id,
        title: "Attempt to edit approved content",
        expectedVersion: approval.data.newVersion,
      }),
    );
    expect(edit, JSON.stringify(edit)).toMatchObject({
      success: false,
      error: { code: "INVALID_STATUS" },
    });
    const saved = await db.deliverable.findUniqueOrThrow({
      where: { id: submitted.id },
    });
    expect(saved).toMatchObject({
      status: "APPROVED",
      title: submitted.title,
      version: 2,
    });

    const deletion = await asUser(fixtureIds.lead, () =>
      deleteDeliverable({ id: submitted.id }),
    );
    expect(deletion).toMatchObject({
      success: false,
      error: { code: "INVALID_STATUS" },
    });
    expect(
      await db.deliverable.findUnique({ where: { id: submitted.id } }),
    ).not.toBeNull();
  });

  it("rolls back the review token when a foreign or unavailable file is attached", async () => {
    const deliverable = await createReviewDeliverable();
    const result = await asUser(fixtureIds.ownerA, () =>
      addDeliverableVersion({
        deliverableId: deliverable.id,
        expectedVersion: deliverable.version,
        fileId: fixtureIds.file,
        notes: "Must not attach an unrelated file",
      }),
    );

    expect(result.success).toBe(false);
    const [saved, versions] = await Promise.all([
      db.deliverable.findUniqueOrThrow({ where: { id: deliverable.id } }),
      db.deliverableVersion.findMany({
        where: { deliverableId: deliverable.id },
      }),
    ]);
    expect(saved.version).toBe(1);
    expect(versions).toHaveLength(0);
  });
});
