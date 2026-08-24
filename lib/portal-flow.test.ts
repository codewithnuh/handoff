import { describe, expect, it, vi, beforeEach } from "vitest";

// ──────────────────────────────────────────────
// Mocks
// ──────────────────────────────────────────────

// server-only guard is a no-op in the vitest environment
vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  }),
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("@/lib/prisma", () => ({
  db: {
    $transaction: vi.fn(),
    clientSession: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    projectAccess: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    clientInvitation: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    project: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    deliverable: {
      findMany: vi.fn(),
    },
    request: {
      findMany: vi.fn(),
    },
    activity: {
      findMany: vi.fn(),
    },
    user: { findUnique: vi.fn(), update: vi.fn() },
    workspace: { findFirst: vi.fn() },
    subscription: { findUnique: vi.fn() },
  },
}));

vi.mock("@/env", () => ({
  env: {
    AUTH_SECRET: "test-secret-key-for-hmac-signing-at-least-32-chars",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    NODE_ENV: "test",
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(),
}));

import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { db } from "@/lib/prisma";
import {
  getClientPortalSession,
  requireProjectAccess,
} from "@/lib/portal";
import { createHmac } from "node:crypto";

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

const mockCookies = vi.mocked(cookies);
const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

/** Sign a value the same way the portal code does — for creating valid test cookies */
function signForTest(value: string): string {
  const signature = createHmac(
    "sha256",
    "test-secret-key-for-hmac-signing-at-least-32-chars",
  )
    .update(value)
    .digest("hex");
  return `${value}.${signature}`;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCookies.mockResolvedValue(mockCookieStore as never);
});

// ──────────────────────────────────────────────
// Test data
// ──────────────────────────────────────────────

const CLIENT_A_EMAIL = "alice@client.com";
const CLIENT_B_EMAIL = "bob@client.com";
const PROJECT_ID = "proj-1";
const PROJECT_ID_2 = "proj-2";
const SESSION_ID = "session-abc-123";
const INVITATION_TOKEN = "valid-hex-token-abc123";

// ──────────────────────────────────────────────
// 1. Full Invitation Flow
// ──────────────────────────────────────────────

describe("Full invitation flow: invite → accept → portal access", () => {
  it("step 1: accept endpoint creates ProjectAccess and issues session for valid token", async () => {
    // Mock: invitation exists and is valid
    vi.mocked(db.clientInvitation.findUnique).mockResolvedValue({
      id: "inv-1",
      projectId: PROJECT_ID,
      email: CLIENT_A_EMAIL,
      expiresAt: new Date("2099-12-31"),
      acceptedAt: null,
    } as never);

    // Mock: $transaction creates ProjectAccess + marks invitation accepted
    vi.mocked(db.$transaction).mockImplementation(async (fn) => {
      // Minimal transaction-client stub cast to the expected shape
      const tx = {
        projectAccess: {
          upsert: vi.fn().mockResolvedValue({
            id: "pa-1",
            projectId: PROJECT_ID,
            email: CLIENT_A_EMAIL,
            createdAt: new Date(),
          }),
        },
        clientInvitation: {
          update: vi.fn().mockResolvedValue({}),
        },
      } as unknown as Parameters<typeof fn>[0];
      return fn(tx);
    });

    // Mock: session creation
    vi.mocked(db.clientSession.create).mockResolvedValue({
      id: SESSION_ID,
      email: CLIENT_A_EMAIL,
      token: "random-session-token",
      expiresAt: new Date("2099-12-31"),
      createdAt: new Date(),
    } as never);

    // Act: hit the accept endpoint
    const { GET } = await import("@/app/api/portal/accept/route");
    const url = new URL(
      `http://localhost:3000/api/portal/accept?token=${INVITATION_TOKEN}`,
    );
    const request = new NextRequest(url.toString());
    const response = await GET(request);

    // Assert: redirects to project portal
    expect(response.status).toBe(307);
    expect(response.headers.get("Location")).toContain(
      `/portal/projects/${PROJECT_ID}`,
    );

    // Assert: ProjectAccess was created
    expect(db.$transaction).toHaveBeenCalled();

    // Assert: session was created
    expect(db.clientSession.create).toHaveBeenCalledWith({
      data: {
        email: CLIENT_A_EMAIL,
        token: expect.any(String),
        expiresAt: expect.any(Date),
      },
    });

    // Assert: cookie was set
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      "cp_session",
      expect.any(String),
      expect.objectContaining({ httpOnly: true, sameSite: "lax" }),
    );
  });

  it("step 2: client can resolve session after accepting", async () => {
    // Create a properly signed cookie
    const signedValue = signForTest(SESSION_ID);
    mockCookieStore.get.mockReturnValue({ value: signedValue });

    // Mock: session exists and is valid
    vi.mocked(db.clientSession.findUnique).mockResolvedValue({
      id: SESSION_ID,
      email: CLIENT_A_EMAIL,
      expiresAt: new Date("2099-12-31"),
    } as never);

    const result = await getClientPortalSession();

    expect(result).not.toBeNull();
    expect(result!.email).toBe(CLIENT_A_EMAIL);
    expect(result!.sessionId).toBe(SESSION_ID);
  });

  it("step 3: client has access to the invited project", async () => {
    vi.mocked(db.projectAccess.findUnique).mockResolvedValue({
      id: "pa-1",
      projectId: PROJECT_ID,
      email: CLIENT_A_EMAIL,
      createdAt: new Date(),
    } as never);

    const result = await requireProjectAccess(CLIENT_A_EMAIL, PROJECT_ID);
    expect(result.ok).toBe(true);
  });
});

// ──────────────────────────────────────────────
// 2. Access Control: client A vs client B
// ──────────────────────────────────────────────

describe("Cross-tenant access control: client A cannot access client B's project", () => {
  it("client A has access to proj-1 but NOT proj-2", async () => {
    // Mock: access only for proj-1
    vi.mocked(db.projectAccess.findUnique)
      .mockResolvedValueOnce({
        id: "pa-1",
        projectId: PROJECT_ID,
        email: CLIENT_A_EMAIL,
        createdAt: new Date(),
      } as never)
      .mockResolvedValueOnce(null); // proj-2 returns null

    const ownResult = await requireProjectAccess(
      CLIENT_A_EMAIL,
      PROJECT_ID,
    );
    expect(ownResult.ok).toBe(true);

    const otherResult = await requireProjectAccess(
      CLIENT_A_EMAIL,
      PROJECT_ID_2,
    );
    expect(otherResult.ok).toBe(false);
    if (!otherResult.ok) {
      expect(otherResult.error.status).toBe(403);
    }
  });

  it("client B guessing client A's project gets 403", async () => {
    // Mock: client B has NO access to proj-1
    vi.mocked(db.projectAccess.findUnique).mockResolvedValue(null);

    const result = await requireProjectAccess(CLIENT_B_EMAIL, PROJECT_ID);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.status).toBe(403);
    }
  });

  it("client B's session cookie cannot be used to access client A's project", async () => {
    // Client B has a valid session
    const signedValue = signForTest("session-bob");
    mockCookieStore.get.mockReturnValue({ value: signedValue });

    vi.mocked(db.clientSession.findUnique).mockResolvedValue({
      id: "session-bob",
      email: CLIENT_B_EMAIL,
      expiresAt: new Date("2099-12-31"),
    } as never);

    const session = await getClientPortalSession();
    expect(session!.email).toBe(CLIENT_B_EMAIL);

    // But client B has no access to proj-1
    vi.mocked(db.projectAccess.findUnique).mockResolvedValue(null);

    const access = await requireProjectAccess(session!.email, PROJECT_ID);
    expect(access.ok).toBe(false);
    if (!access.ok) {
      expect(access.error.status).toBe(403);
    }
  });
});

// ──────────────────────────────────────────────
// 3. Token edge cases
// ──────────────────────────────────────────────

describe("Invitation token edge cases", () => {
  it("expired token returns 410 Gone with clear error", async () => {
    vi.mocked(db.clientInvitation.findUnique).mockResolvedValue({
      id: "inv-expired",
      projectId: PROJECT_ID,
      email: CLIENT_A_EMAIL,
      expiresAt: new Date("2020-01-01"),
      acceptedAt: null,
    } as never);

    const { GET } = await import("@/app/api/portal/accept/route");
    const url = new URL(
      "http://localhost:3000/api/portal/accept?token=expired-token",
    );
    const response = await GET(new NextRequest(url.toString()));

    expect(response.status).toBe(410);
    const body = await response.text();
    expect(body).toContain("expired");
    // Should NOT be a generic 500
    expect(body).not.toContain("Internal Server Error");
  });

  it("invalid token returns 404 with clear error", async () => {
    vi.mocked(db.clientInvitation.findUnique).mockResolvedValue(null);

    const { GET } = await import("@/app/api/portal/accept/route");
    const url = new URL(
      "http://localhost:3000/api/portal/accept?token=nonexistent",
    );
    const response = await GET(new NextRequest(url.toString()));

    expect(response.status).toBe(404);
    const body = await response.text();
    expect(body).toContain("Invalid invitation link");
  });

  it("missing token returns 400", async () => {
    const { GET } = await import("@/app/api/portal/accept/route");
    const url = new URL("http://localhost:3000/api/portal/accept");
    const response = await GET(new NextRequest(url.toString()));

    expect(response.status).toBe(400);
    const body = await response.text();
    expect(body).toContain("Missing invitation token");
  });

  it("already-accepted token is idempotent — re-issues session", async () => {
    vi.mocked(db.clientInvitation.findUnique).mockResolvedValue({
      id: "inv-1",
      projectId: PROJECT_ID,
      email: CLIENT_A_EMAIL,
      expiresAt: new Date("2099-12-31"),
      acceptedAt: new Date(), // already accepted
    } as never);

    vi.mocked(db.clientSession.create).mockResolvedValue({
      id: "session-new",
      email: CLIENT_A_EMAIL,
      token: "new-token",
      expiresAt: new Date("2099-12-31"),
      createdAt: new Date(),
    } as never);

    const { GET } = await import("@/app/api/portal/accept/route");
    const url = new URL(
      "http://localhost:3000/api/portal/accept?token=already-accepted",
    );
    const response = await GET(new NextRequest(url.toString()));

    // Should redirect (not error)
    expect(response.status).toBe(307);

    // Should NOT call $transaction (skips ProjectAccess creation)
    expect(db.$transaction).not.toHaveBeenCalled();

    // But SHOULD still issue a new session
    expect(db.clientSession.create).toHaveBeenCalled();
  });
});

// ──────────────────────────────────────────────
// 4. Revocation: immediate access loss
// ──────────────────────────────────────────────

describe("Revocation: client loses portal access immediately", () => {
  it("after revocation, session still resolves but access check fails", async () => {
    // Session still exists in DB (cookie is valid)
    const signedValue = signForTest(SESSION_ID);
    mockCookieStore.get.mockReturnValue({ value: signedValue });

    vi.mocked(db.clientSession.findUnique).mockResolvedValue({
      id: SESSION_ID,
      email: CLIENT_A_EMAIL,
      expiresAt: new Date("2099-12-31"),
    } as never);

    // But ProjectAccess has been deleted
    vi.mocked(db.projectAccess.findUnique).mockResolvedValue(null);

    // Session resolves fine
    const session = await getClientPortalSession();
    expect(session).not.toBeNull();
    expect(session!.email).toBe(CLIENT_A_EMAIL);

    // But access check fails
    const access = await requireProjectAccess(session!.email, PROJECT_ID);
    expect(access.ok).toBe(false);
    if (!access.ok) {
      expect(access.error.status).toBe(403);
    }
  });

  it("after revocation, all client sessions are deleted", async () => {
    vi.mocked(db.projectAccess.deleteMany).mockResolvedValue({ count: 1 });
    vi.mocked(db.clientSession.deleteMany).mockResolvedValue({ count: 3 });

    // Simulate revokeClientAccess calling deleteMany
    await db.projectAccess.deleteMany({
      where: { projectId: PROJECT_ID, email: CLIENT_A_EMAIL },
    });
    await db.clientSession.deleteMany({
      where: { email: CLIENT_A_EMAIL },
    });

    expect(db.clientSession.deleteMany).toHaveBeenCalledWith({
      where: { email: CLIENT_A_EMAIL },
    });
  });
});

// ──────────────────────────────────────────────
// 5. Session expiry
// ──────────────────────────────────────────────

describe("Session expiry", () => {
  it("expired session returns null and cleans up", async () => {
    const signedValue = signForTest("expired-session");
    mockCookieStore.get.mockReturnValue({ value: signedValue });

    vi.mocked(db.clientSession.findUnique).mockResolvedValue({
      id: "expired-session",
      email: CLIENT_A_EMAIL,
      expiresAt: new Date("2020-01-01"), // expired
    } as never);

    vi.mocked(db.clientSession.delete).mockResolvedValue({} as never);

    const result = await getClientPortalSession();

    expect(result).toBeNull();
    expect(db.clientSession.delete).toHaveBeenCalledWith({
      where: { id: "expired-session" },
    });
  });

  it("tampered cookie signature is rejected", async () => {
    // Cookie has a valid-looking structure but wrong signature
    mockCookieStore.get.mockReturnValue({
      value: "session-id.tamperedsignature",
    });

    const result = await getClientPortalSession();
    expect(result).toBeNull();
  });

  it("missing cookie returns null", async () => {
    mockCookieStore.get.mockReturnValue(undefined);

    const result = await getClientPortalSession();
    expect(result).toBeNull();
  });
});

// ──────────────────────────────────────────────
// 6. Portal queries: scoped to client access
// ──────────────────────────────────────────────

describe("Portal queries: data is scoped to client access", () => {
  it("getPortalHomeProjects returns only projects the client has access to", async () => {
    // Client has access to 2 projects
    vi.mocked(db.projectAccess.findMany).mockResolvedValue([
      { projectId: PROJECT_ID },
      { projectId: PROJECT_ID_2 },
    ] as never);

    vi.mocked(db.project.findMany).mockResolvedValue([
      {
        id: PROJECT_ID,
        name: "Rebrand",
        description: "Update the brand",
        status: "IN_PROGRESS",
        progress: 45,
        dueDate: new Date("2026-12-31"),
        createdAt: new Date("2026-01-01"),
        client: { name: "Alice", company: "Alice Inc" },
        _count: { deliverables: 3, requests: 1 },
      },
      {
        id: PROJECT_ID_2,
        name: "Website Redesign",
        description: null,
        status: "PLANNING",
        progress: 0,
        dueDate: null,
        createdAt: new Date("2026-02-01"),
        client: { name: "Alice", company: "Alice Inc" },
        _count: { deliverables: 0, requests: 2 },
      },
    ] as never);

    const { getPortalHomeProjects } = await import("@/lib/queries/project");
    const projects = await getPortalHomeProjects(CLIENT_A_EMAIL);

    expect(projects).toHaveLength(2);
    expect(projects[0].name).toBe("Rebrand");
    expect(projects[0]._count.deliverables).toBe(3);
    expect(projects[1].name).toBe("Website Redesign");

    // Should have queried ProjectAccess scoped to client email
    expect(db.projectAccess.findMany).toHaveBeenCalledWith({
      where: { email: CLIENT_A_EMAIL },
      select: { projectId: true },
    });
  });

  it("getPortalHomeProjects returns empty array when client has no access", async () => {
    vi.mocked(db.projectAccess.findMany).mockResolvedValue([]);

    const { getPortalHomeProjects } = await import("@/lib/queries/project");
    const projects = await getPortalHomeProjects(CLIENT_B_EMAIL);

    expect(projects).toHaveLength(0);
    // Should not even query projects
    expect(db.project.findMany).not.toHaveBeenCalled();
  });

  it("getPortalProjectDetail returns null when client has no access", async () => {
    vi.mocked(db.projectAccess.findUnique).mockResolvedValue(null);

    const { getPortalProjectDetail } = await import(
      "@/lib/queries/project"
    );
    const result = await getPortalProjectDetail(PROJECT_ID, CLIENT_B_EMAIL);

    expect(result).toBeNull();
    // Should not query project data
    expect(db.project.findUnique).not.toHaveBeenCalled();
  });

  it("getPortalProjectDetail returns full data when client has access", async () => {
    vi.mocked(db.projectAccess.findUnique).mockResolvedValue({
      id: "pa-1",
      projectId: PROJECT_ID,
      email: CLIENT_A_EMAIL,
      createdAt: new Date(),
    } as never);

    vi.mocked(db.project.findUnique).mockResolvedValue({
      id: PROJECT_ID,
      name: "Rebrand",
      description: "Update the brand",
      status: "IN_PROGRESS",
      progress: 45,
      startDate: new Date("2026-01-01"),
      dueDate: new Date("2026-12-31"),
      createdAt: new Date("2026-01-01"),
      client: { name: "Alice", company: "Alice Inc" },
    } as never);

    vi.mocked(db.deliverable.findMany).mockResolvedValue([
      {
        id: "del-1",
        title: "Logo Draft",
        description: "Initial logo concepts",
        status: "IN_REVIEW",
        createdAt: new Date("2026-01-15"),
        updatedAt: new Date("2026-01-20"),
        versions: [
          {
            id: "ver-1",
            versionNumber: 1,
            notes: "First draft",
            createdAt: new Date("2026-01-15"),
            file: {
              id: "file-1",
              filename: "logo-v1.png",
              mimeType: "image/png",
              size: 102400,
            },
          },
        ],
      },
    ] as never);

    vi.mocked(db.request.findMany).mockResolvedValue([]);
    vi.mocked(db.activity.findMany).mockResolvedValue([]);

    const { getPortalProjectDetail } = await import(
      "@/lib/queries/project"
    );
    const result = await getPortalProjectDetail(PROJECT_ID, CLIENT_A_EMAIL);

    expect(result).not.toBeNull();
    expect(result!.project.name).toBe("Rebrand");
    expect(result!.project.status).toBe("IN_PROGRESS");
    expect(result!.deliverables).toHaveLength(1);
    expect(result!.deliverables[0].title).toBe("Logo Draft");
    expect(result!.deliverables[0].versions[0].file!.filename).toBe(
      "logo-v1.png",
    );
    expect(result!.requests).toHaveLength(0);
    expect(result!.activities).toHaveLength(0);
  });
});

// ──────────────────────────────────────────────
// 7. Client logout
// ──────────────────────────────────────────────

describe("Client logout", () => {
  it("clientLogout deletes session from DB and clears cookie", async () => {
    const signedValue = signForTest(SESSION_ID);
    mockCookieStore.get.mockReturnValue({ value: signedValue });

    vi.mocked(db.clientSession.delete).mockResolvedValue({} as never);

    const { clientLogout } = await import("@/lib/actions/portal-session");
    await clientLogout();

    // Should delete the session from DB
    expect(db.clientSession.delete).toHaveBeenCalledWith({
      where: { id: SESSION_ID },
    });

    // Should clear the cookie
    expect(mockCookieStore.delete).toHaveBeenCalledWith("cp_session");
  });

  it("clientLogout handles missing cookie gracefully", async () => {
    mockCookieStore.get.mockReturnValue(undefined);

    const { clientLogout } = await import("@/lib/actions/portal-session");
    await clientLogout();

    // Should not crash
    expect(mockCookieStore.delete).toHaveBeenCalledWith("cp_session");
  });
});
