import { beforeEach, describe, expect, it, vi } from "vitest";
import { createProject, updateProjectStatus } from "@/lib/actions/project";
import { db } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ERROR_CODES } from "@/lib/constants/errors";

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: { getSession: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({
  db: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    workspace: { findFirst: vi.fn(), findUnique: vi.fn() },
    client: { findFirst: vi.fn() },
    project: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    subscription: { findUnique: vi.fn() },
    activity: { create: vi.fn() },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const getSession = vi.mocked(auth.api.getSession);
const findWorkspace = vi.mocked(db.workspace.findFirst);
const findWorkspaceUnique = vi.mocked(db.workspace.findUnique);
const findClient = vi.mocked(db.client.findFirst);
const findProjectFirst = vi.mocked(db.project.findFirst);
const findProjectUnique = vi.mocked(db.project.findUnique);
const createProjectDb = vi.mocked(db.project.create);
const updateProjectDb = vi.mocked(db.project.update);
const createActivity = vi.mocked(db.activity.create);

const user = {
  id: "user-1",
  name: "John Doe",
  email: "john@example.com",
  emailVerified: true,
  image: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

const workspace = {
  id: "ws-1",
  name: "John's Studio",
  ownerId: "user-1",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

const projectRow = {
  id: "proj-1",
  workspaceId: "ws-1",
  clientId: "client-1",
  name: "Rebrand",
  description: null,
  status: "PLANNING",
  progress: 0,
  startDate: null,
  dueDate: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

const findUser = vi.mocked(db.user.findUnique);
const findSubscription = vi.mocked(db.subscription.findUnique);

const signedIn = async () => {
  getSession.mockResolvedValue({ session: {} as never, user });
  findUser.mockResolvedValue({ activeWorkspaceId: "ws-1" } as never);
  findWorkspace.mockResolvedValue(workspace);
  findWorkspaceUnique.mockResolvedValue({ ownerId: "user-1" } as never);
  findSubscription.mockResolvedValue({ plan: "FREE", status: "ACTIVE", canceledAt: null, pausedAt: null, gracePeriodEndsAt: null } as never);
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createProject", () => {
  it("returns FORBIDDEN/NOT_FOUND when the client isn't in the workspace", async () => {
    await signedIn();
    findClient.mockResolvedValue(null);

    const result = await createProject({
      clientId: "client-foreign",
      name: "Rebrand",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.NOT_FOUND);
    }
    expect(createProjectDb).not.toHaveBeenCalled();
  });

  it("creates a project and records a PROJECT_CREATED activity", async () => {
    await signedIn();
    findClient.mockResolvedValue({ id: "client-1" } as never);
    createProjectDb.mockResolvedValue(projectRow as never);

    const result = await createProject({
      clientId: "client-1",
      name: "Rebrand",
      progress: 10,
    });

    expect(result.success).toBe(true);
    expect(createProjectDb).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workspaceId: "ws-1",
        clientId: "client-1",
        name: "Rebrand",
        progress: 10,
      }),
    });
    expect(createActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: "proj-1",
          type: "PROJECT_CREATED",
          actorUserId: "user-1",
        }),
      }),
    );
  });
});

describe("updateProjectStatus", () => {
  it("updates the status and records a PROJECT_STATUS_CHANGED activity", async () => {
    await signedIn();
    findProjectFirst.mockResolvedValue({ id: "proj-1" } as never);
    findProjectUnique.mockResolvedValue(projectRow as never);
    updateProjectDb.mockResolvedValue({
      ...projectRow,
      status: "IN_PROGRESS",
    } as never);

    const result = await updateProjectStatus({
      id: "proj-1",
      status: "IN_PROGRESS",
    });

    expect(result.success).toBe(true);
    expect(updateProjectDb).toHaveBeenCalledWith({
      where: { id: "proj-1" },
      data: { status: "IN_PROGRESS" },
    });
    expect(createActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: "proj-1",
          type: "PROJECT_STATUS_CHANGED",
          meta: { from: "PLANNING", to: "IN_PROGRESS" },
        }),
      }),
    );
  });
});
