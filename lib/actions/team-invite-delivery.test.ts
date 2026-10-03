import { beforeEach, describe, expect, it, vi } from "vitest";
import { inviteTeammate, retryTeamInviteEmail } from "@/lib/actions/team";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock("@/lib/prisma", async () => ({ db: (await import("@/lib/test/fake-db")).fakeDb }));
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(),
  teamInviteEmailHtml: vi.fn(() => "<html />"),
}));
vi.mock("@/env", () => ({
  env: {
    DATABASE_URL: "postgresql://user:password@localhost:5432/handoff",
    AUTH_SECRET: "test-auth-secret-at-least-32-characters-long",
    BETTER_AUTH_SECRET: "test-auth-secret-at-least-32-characters-long",
    BETTER_AUTH_URL: "http://localhost:3000",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    NODE_ENV: "test",
    UPLOADTHING_TOKEN: Buffer.from(JSON.stringify({ apiKey: "sk_test", appId: "test", regions: ["us-east-1"] })).toString("base64"),
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const workspace = { id: "workspace-1", name: "Studio", ownerId: "owner-1" };
const invite = {
  id: "invite-1",
  workspaceId: workspace.id,
  email: "teammate@example.com",
  token: "stable-invite-token",
  invitedByEmail: "owner@example.com",
  projectIds: [],
  role: "MEMBER",
  permissions: [],
  expiresAt: new Date("2099-12-31"),
  acceptedAt: null,
  createdAt: new Date("2026-01-01"),
  emailStatus: "PENDING",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue({
    session: {} as never,
    user: { id: "owner-1", name: "Owner", email: "owner@example.com", emailVerified: true } as never,
  } as never);
  vi.mocked(db.user.findUnique).mockResolvedValue(null as never);
  vi.mocked(db.user.update).mockResolvedValue({} as never);
  vi.mocked(db.workspace.findFirst).mockResolvedValue(workspace as never);
  vi.mocked(db.workspaceMember.findMany).mockResolvedValue([] as never);
  vi.mocked(db.project.findMany).mockResolvedValue([] as never);
  vi.mocked(db.teamInvitation.findFirst).mockResolvedValue(null as never);
  vi.mocked(db.teamInvitation.create).mockResolvedValue(invite as never);
  vi.mocked(db.teamInvitation.updateMany).mockResolvedValue({ count: 1 } as never);
  vi.mocked(db.$transaction).mockImplementation(async (fn) => fn(db as never));
});

describe("team invite email delivery", () => {
  it("commits the invite and reports failed mail accurately", async () => {
    vi.mocked(sendEmail).mockRejectedValueOnce(new Error("private smtp detail"));

    const created = await inviteTeammate({
      email: invite.email,
      projectIds: [],
      role: "MEMBER",
      permissions: [],
    });
    expect(created.success).toBe(true);
    if (!created.success) return;
    expect(created.data.id).toBe(invite.id);
    expect(created.data.token).toBe(invite.token);
    expect(created.data.emailStatus).toBe("FAILED");
    expect(db.teamInvitation.create).toHaveBeenCalledTimes(1);

  });

  it("retries delivery using the existing token and row", async () => {
    vi.mocked(db.teamInvitation.findFirst).mockResolvedValue(invite as never);
    vi.mocked(sendEmail).mockResolvedValue(undefined);
    const retried = await retryTeamInviteEmail({ id: invite.id });

    expect(retried.success).toBe(true);
    if (retried.success) {
      expect(retried.data.token).toBe(invite.token);
      expect(retried.data.emailStatus).toBe("SENT");
    }
    expect(db.teamInvitation.updateMany).toHaveBeenCalledWith({
      where: { id: invite.id, acceptedAt: null },
      data: { emailStatus: "SENT" },
    });
  });
});
