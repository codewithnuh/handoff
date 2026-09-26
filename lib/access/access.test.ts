import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", async () => ({
  db: (await import("@/lib/test/fake-db")).fakeDb,
}));

import {
  requirePortalSession,
  requireWorkspace,
  resolveProjectAccess,
  setSubjectAdapters,
} from "@/lib/access";
import { db } from "@/lib/prisma";
import { ERROR_CODES } from "@/lib/constants/errors";

const findUser = vi.mocked(db.user.findUnique);
const findWorkspace = vi.mocked(db.workspace.findFirst);
const findWorkspaceMembership = vi.mocked(db.workspaceMember.findUnique);
const findProject = vi.mocked(db.project.findFirst);
const findProjectMembership = vi.mocked(db.projectMember.findUnique);

const user = {
  id: "user-1",
  name: "Ada Lovelace",
  email: "ada@example.com",
  emailVerified: true,
  image: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

const workspace = {
  id: "ws-1",
  name: "Ada's Studio",
  ownerId: "user-1",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

const project = { id: "proj-1", workspaceId: "ws-1" };

const signIn = (signedInUser: typeof user | null = user) =>
  setSubjectAdapters({
    getUser: () => Promise.resolve(signedInUser as never),
    getClient: () => Promise.resolve(null),
  });

const signedInAsOwner = () => {
  signIn();
  findUser.mockResolvedValue({ activeWorkspaceId: "ws-1" } as never);
  findWorkspace.mockResolvedValue(workspace as never);
  findProject.mockResolvedValue(project as never);
};

beforeEach(() => {
  vi.clearAllMocks();
  setSubjectAdapters({
    getUser: () => Promise.resolve(null),
    getClient: () => Promise.resolve(null),
  });
});

describe("injected identity adapter", () => {
  it("requireWorkspace rejects when no subject is injected", async () => {
    signIn(null);

    const guard = await requireWorkspace();

    expect(guard.ok).toBe(false);
    if (!guard.ok) expect(guard.error.error.code).toBe(ERROR_CODES.UNAUTHORIZED);
  });

  it("requirePortalSession resolves a portal session from the injected adapter", async () => {
    signIn(null);
    setSubjectAdapters({
      getClient: () =>
        Promise.resolve({ sessionId: "s-1", email: "client@test.com" }),
    });

    const guard = await requirePortalSession();

    expect(guard.ok).toBe(true);
    if (guard.ok) expect(guard.value.email).toBe("client@test.com");
  });
});

describe("requireWorkspace", () => {
  it("resolves the owner's standing", async () => {
    signedInAsOwner();

    const guard = await requireWorkspace();

    expect(guard.ok).toBe(true);
    if (guard.ok) {
      expect(guard.value.workspace.id).toBe("ws-1");
      expect(guard.value.isOwner).toBe(true);
      expect(guard.value.isAdmin).toBe(true);
      expect(guard.value.memberRole).toBeNull();
    }
  });

  it("resolves a member's role and permissions", async () => {
    signIn();
    findUser.mockResolvedValue({ activeWorkspaceId: "ws-1" } as never);
    findWorkspace.mockResolvedValue({ ...workspace, ownerId: "user-9" } as never);
    findWorkspaceMembership.mockResolvedValue({
      role: "MEMBER",
      permissions: ["MANAGE_TASKS"],
    } as never);

    const guard = await requireWorkspace();

    expect(guard.ok).toBe(true);
    if (guard.ok) {
      expect(guard.value.isOwner).toBe(false);
      expect(guard.value.isAdmin).toBe(false);
      expect(guard.value.memberRole).toBe("MEMBER");
      expect(guard.value.permissions).toEqual(["MANAGE_TASKS"]);
    }
  });

  it("fails with NOT_FOUND when the account has no workspace", async () => {
    signIn();
    findUser.mockResolvedValue({ activeWorkspaceId: null } as never);
    findWorkspace.mockResolvedValue(null);
    vi.mocked(db.workspaceMember.findFirst).mockResolvedValue(null);

    const guard = await requireWorkspace();

    expect(guard.ok).toBe(false);
    if (!guard.ok) expect(guard.error.error.code).toBe(ERROR_CODES.NOT_FOUND);
  });
});

describe("resolveProjectAccess", () => {
  it("returns NOT_FOUND when the project is in another workspace", async () => {
    signedInAsOwner();
    findProject.mockResolvedValue(null);

    const guard = await resolveProjectAccess("proj-1");

    expect(guard.ok).toBe(false);
    if (!guard.ok) expect(guard.error.error.code).toBe(ERROR_CODES.NOT_FOUND);
  });

  it("gives the owner full control", async () => {
    signedInAsOwner();

    const guard = await resolveProjectAccess("proj-1");

    expect(guard.ok).toBe(true);
    if (guard.ok) {
      expect(guard.value.role).toBe("OWNER");
      expect(guard.value.canDeleteProject).toBe(true);
      expect(guard.value.canSubmitForReview).toBe(true);
      expect(guard.value.isObserver).toBe(false);
    }
  });

  it("rejects a workspace member with no project membership", async () => {
    signIn();
    findUser.mockResolvedValue({ activeWorkspaceId: "ws-1" } as never);
    findWorkspace.mockResolvedValue({ ...workspace, ownerId: "user-9" } as never);
    findWorkspaceMembership.mockResolvedValue({
      role: "MEMBER",
      permissions: [],
    } as never);
    findProject.mockResolvedValue(project as never);
    findProjectMembership.mockResolvedValue(null);

    const guard = await resolveProjectAccess("proj-1");

    expect(guard.ok).toBe(false);
    if (!guard.ok) expect(guard.error.error.code).toBe(ERROR_CODES.FORBIDDEN);
  });

  const memberCases = [
    {
      role: "LEAD",
      expected: {
        canEditProject: true,
        canDeleteProject: false,
        canManageDeliverables: true,
        canSubmitForReview: true,
        canUpdateRequests: true,
        isObserver: false,
      },
    },
    {
      role: "CONTRIBUTOR",
      expected: {
        canEditProject: false,
        canDeleteProject: false,
        canManageDeliverables: true,
        canSubmitForReview: false,
        canUpdateRequests: false,
        isObserver: false,
      },
    },
    {
      role: "OBSERVER",
      expected: {
        canEditProject: false,
        canDeleteProject: false,
        canManageDeliverables: false,
        canSubmitForReview: false,
        canUpdateRequests: false,
        isObserver: true,
      },
    },
  ] as const;

  for (const { role, expected } of memberCases) {
    it(`maps a ${role} membership to its capabilities`, async () => {
      signIn();
      findUser.mockResolvedValue({ activeWorkspaceId: "ws-1" } as never);
      findWorkspace.mockResolvedValue({ ...workspace, ownerId: "user-9" } as never);
      findWorkspaceMembership.mockResolvedValue({
        role: "MEMBER",
        permissions: [],
      } as never);
      findProject.mockResolvedValue(project as never);
      findProjectMembership.mockResolvedValue({ role } as never);

      const guard = await resolveProjectAccess("proj-1");

      expect(guard.ok).toBe(true);
      if (guard.ok) {
        expect(guard.value.role).toBe(role);
        expect(guard.value).toMatchObject(expected);
      }
    });
  }
});

describe("portal session", () => {
  it("rejects when no portal session resolves", async () => {
    signIn(null);

    const guard = await requirePortalSession();

    expect(guard.ok).toBe(false);
    if (!guard.ok) expect(guard.error.error.code).toBe(ERROR_CODES.UNAUTHORIZED);
  });
});
