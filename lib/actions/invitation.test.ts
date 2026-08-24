import { beforeEach, describe, expect, it, vi } from "vitest";
import { revokeClientAccess, resendInvitation } from "@/lib/actions/invitation";
import { db } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ERROR_CODES } from "@/lib/constants/errors";

// ──────────────────────────────────────────────
// Mocks
// ──────────────────────────────────────────────

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
    workspace: { findFirst: vi.fn() },
    project: { findFirst: vi.fn() },
    clientInvitation: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    projectAccess: {
      deleteMany: vi.fn(),
      upsert: vi.fn(),
    },
    clientSession: {
      deleteMany: vi.fn(),
    },
    activity: { create: vi.fn() },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(),
}));

const getSession = vi.mocked(auth.api.getSession);
const findWorkspace = vi.mocked(db.workspace.findFirst);
const findUser = vi.mocked(db.user.findUnique);
const findProject = vi.mocked(db.project.findFirst);

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

const signedIn = async () => {
  getSession.mockResolvedValue({ session: {} as never, user });
  findUser.mockResolvedValue({ activeWorkspaceId: "ws-1" } as never);
  findWorkspace.mockResolvedValue(workspace);
  findProject.mockResolvedValue({ id: "proj-1" } as never);
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ──────────────────────────────────────────────
// revokeClientAccess
// ──────────────────────────────────────────────

describe("revokeClientAccess", () => {
  it("returns NOT_FOUND when no access record exists", async () => {
    await signedIn();
    vi.mocked(db.projectAccess.deleteMany).mockResolvedValue({ count: 0 });

    const result = await revokeClientAccess({
      projectId: "proj-1",
      email: "client@test.com",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.NOT_FOUND);
    }
  });

  it("revokes access and deletes all client sessions", async () => {
    await signedIn();
    vi.mocked(db.projectAccess.deleteMany).mockResolvedValue({ count: 1 });
    vi.mocked(db.clientSession.deleteMany).mockResolvedValue({ count: 2 });

    const result = await revokeClientAccess({
      projectId: "proj-1",
      email: "client@test.com",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.revoked).toBe(true);
      expect(result.data.email).toBe("client@test.com");
    }

    // Should have deleted ProjectAccess
    expect(db.projectAccess.deleteMany).toHaveBeenCalledWith({
      where: { projectId: "proj-1", email: "client@test.com" },
    });

    // Should have deleted ALL sessions for this email (immediate revocation)
    expect(db.clientSession.deleteMany).toHaveBeenCalledWith({
      where: { email: "client@test.com" },
    });
  });
});

// ──────────────────────────────────────────────
// resendInvitation
// ──────────────────────────────────────────────

describe("resendInvitation", () => {
  it("invalidates old unaccepted invitations and creates a new one", async () => {
    await signedIn();

    vi.mocked(db.clientInvitation.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(db.clientInvitation.create).mockResolvedValue({
      id: "inv-2",
      projectId: "proj-1",
      email: "client@test.com",
      token: "new-token",
      expiresAt: new Date("2099-12-31"),
      acceptedAt: null,
      createdAt: new Date(),
    } as never);

    const result = await resendInvitation({
      projectId: "proj-1",
      email: "client@test.com",
    });

    expect(result.success).toBe(true);

    // Should have invalidated old invitations
    expect(db.clientInvitation.updateMany).toHaveBeenCalledWith({
      where: {
        projectId: "proj-1",
        email: "client@test.com",
        acceptedAt: null,
      },
      data: { expiresAt: expect.any(Date) },
    });

    // Should have created a new invitation
    expect(db.clientInvitation.create).toHaveBeenCalled();
  });
});
