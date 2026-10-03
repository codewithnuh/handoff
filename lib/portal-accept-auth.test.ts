import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { db } from "@/lib/prisma";
import { getClientPortalSession } from "@/lib/portal";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", async () => ({
  db: (await import("@/lib/test/fake-db")).fakeDb,
}));
vi.mock("@/lib/portal", () => ({
  getClientPortalSession: vi.fn(),
  replaceClientSession: vi.fn(),
  buildClientSessionCookieHeader: vi.fn(() => "cp_session=signed-session; HttpOnly"),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getClientPortalSession).mockResolvedValue(null);
});

function request() {
  return new NextRequest("http://localhost:3000/api/portal/accept", {
    method: "POST",
    body: new URLSearchParams({ token: "valid-invitation-token" }),
  });
}

describe("portal acceptance with an existing session", () => {
  it("rejects a session whose email does not match the invite", async () => {
    vi.mocked(getClientPortalSession).mockResolvedValue({
      sessionId: "session-1",
      email: "other@example.test",
    });
    const claim = vi.fn();
    vi.mocked(db.$transaction).mockImplementation(async (fn) => {
      return fn({
        clientInvitation: {
          findUnique: vi.fn().mockResolvedValue({
            id: "invite-1", projectId: "project-1", email: "client@example.test",
            expiresAt: new Date("2099-12-31"), acceptedAt: null,
          }),
          updateMany: claim,
        },
        projectAccess: { findUnique: vi.fn(), upsert: vi.fn() },
        clientSession: { deleteMany: vi.fn(), create: vi.fn() },
      } as never);
    });

    const { POST } = await import("@/app/api/portal/accept/route");
    const response = await POST(request());

    expect(response.status).toBe(403);
    expect(claim).not.toHaveBeenCalled();
    expect(response.headers.get("Set-Cookie")).toBeNull();
  });

  it("redirects a replay only when the existing session has explicit project access", async () => {
    vi.mocked(getClientPortalSession).mockResolvedValue({
      sessionId: "session-1",
      email: "client@example.test",
    });
    const accessLookup = vi.fn().mockResolvedValue({ id: "access-1" });
    vi.mocked(db.$transaction).mockImplementation(async (fn) => {
      return fn({
        clientInvitation: {
          findUnique: vi.fn().mockResolvedValue({
            id: "invite-1", projectId: "project-1", email: "client@example.test",
            expiresAt: new Date("2099-12-31"), acceptedAt: new Date(),
          }),
          updateMany: vi.fn(),
        },
        projectAccess: { findUnique: accessLookup, upsert: vi.fn() },
        clientSession: { deleteMany: vi.fn(), create: vi.fn() },
      } as never);
    });

    const { POST } = await import("@/app/api/portal/accept/route");
    const response = await POST(request());

    expect(response.status).toBe(307);
    expect(response.headers.get("Location")).toContain("/portal/projects/project-1");
    expect(accessLookup).toHaveBeenCalledWith({
      where: {
        projectId_email: { projectId: "project-1", email: "client@example.test" },
      },
      select: { id: true },
    });
    expect(response.headers.get("Set-Cookie")).toBeNull();
  });

  it("rejects a replay when the existing session has no project access", async () => {
    vi.mocked(getClientPortalSession).mockResolvedValue({
      sessionId: "session-1",
      email: "client@example.test",
    });
    vi.mocked(db.$transaction).mockImplementation(async (fn) => {
      return fn({
        clientInvitation: {
          findUnique: vi.fn().mockResolvedValue({
            id: "invite-1", projectId: "project-1", email: "client@example.test",
            expiresAt: new Date("2099-12-31"), acceptedAt: new Date(),
          }),
          updateMany: vi.fn(),
        },
        projectAccess: { findUnique: vi.fn().mockResolvedValue(null), upsert: vi.fn() },
        clientSession: { deleteMany: vi.fn(), create: vi.fn() },
      } as never);
    });

    const { POST } = await import("@/app/api/portal/accept/route");
    const response = await POST(request());

    expect(response.status).toBe(307);
    expect(response.headers.get("Location")).toContain("/portal/expired");
    expect(response.headers.get("Set-Cookie")).toBeNull();
  });
});
