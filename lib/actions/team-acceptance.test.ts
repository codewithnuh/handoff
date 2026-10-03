import { beforeEach, describe, expect, it, vi } from "vitest";
import { acceptTeamInvite } from "@/lib/actions/team";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { ERROR_CODES } from "@/lib/constants/errors";

vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));
vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn(), signUpEmail: vi.fn() } },
}));
vi.mock("@/lib/prisma", async () => ({
  db: (await import("@/lib/test/fake-db")).fakeDb,
}));
vi.mock("@/env", () => ({
  env: { NEXT_PUBLIC_APP_URL: "http://localhost:3000", NODE_ENV: "test" },
}));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const invitation = {
  id: "invite-1",
  token: "team-invitation-token",
  email: "member@example.com",
  workspaceId: "workspace-1",
  workspace: { id: "workspace-1", name: "Studio" },
  projectIds: [],
  role: "MEMBER",
  permissions: [],
  acceptedAt: null,
  expiresAt: new Date("2099-12-31"),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(db.$transaction).mockImplementation(async (fn) => fn(db as never));
  vi.mocked(db.teamInvitation.findUnique).mockResolvedValue(invitation as never);
  vi.mocked(db.workspace.findUnique).mockResolvedValue({ ownerId: "owner-1" } as never);
  vi.mocked(db.teamInvitation.updateMany).mockResolvedValue({ count: 1 } as never);
  vi.mocked(db.project.findMany).mockResolvedValue([] as never);
  vi.mocked(db.workspace.count).mockResolvedValue(1 as never);
  vi.mocked(db.workspaceMember.count).mockResolvedValue(0 as never);
  vi.mocked(db.user.update).mockResolvedValue({} as never);
});

describe("acceptTeamInvite identity and atomic claim", () => {
  it("accepts a verified existing account with a case-insensitive email match", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      session: {} as never,
      user: { id: "member-1", email: "Member@Example.com", emailVerified: true } as never,
    } as never);

    const result = await acceptTeamInvite({ token: invitation.token });

    expect(result.success).toBe(true);
    expect(db.teamInvitation.updateMany).toHaveBeenCalledWith({
      where: {
        id: invitation.id,
        acceptedAt: null,
        expiresAt: { gt: expect.any(Date) },
      },
      data: { acceptedAt: expect.any(Date) },
    });
    expect(db.workspaceMember.upsert).toHaveBeenCalled();
    expect(auth.api.signUpEmail).not.toHaveBeenCalled();
  });

  it("rejects a session with a different email without consuming the invite", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      session: {} as never,
      user: { id: "other-1", email: "other@example.com", emailVerified: true } as never,
    } as never);

    const result = await acceptTeamInvite({ token: invitation.token });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe(ERROR_CODES.FORBIDDEN);
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(db.teamInvitation.updateMany).not.toHaveBeenCalled();
  });

  it("rejects an unverified existing account without consuming the invite", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      session: {} as never,
      user: { id: "member-1", email: "member@example.com", emailVerified: false } as never,
    } as never);

    const result = await acceptTeamInvite({ token: invitation.token });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe(ERROR_CODES.FORBIDDEN);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("does not grant membership if another request already claimed the invite", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      session: {} as never,
      user: { id: "member-1", email: "member@example.com", emailVerified: true } as never,
    } as never);
    vi.mocked(db.teamInvitation.updateMany).mockResolvedValue({ count: 0 } as never);

    const result = await acceptTeamInvite({ token: invitation.token });

    expect(result.success).toBe(false);
    expect(db.workspaceMember.upsert).not.toHaveBeenCalled();
    expect(db.projectMember.upsert).not.toHaveBeenCalled();
  });

  it("cannot turn a team invitation into ownership of the workspace", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      session: {} as never,
      user: { id: "owner-1", email: "member@example.com", emailVerified: true } as never,
    } as never);

    const result = await acceptTeamInvite({ token: invitation.token });

    expect(result.success).toBe(false);
    expect(db.teamInvitation.updateMany).not.toHaveBeenCalled();
    expect(db.workspaceMember.upsert).not.toHaveBeenCalled();
  });
});
