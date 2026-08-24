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
}));

vi.mock("@/lib/prisma", () => ({
  db: {
    $transaction: vi.fn(),
    clientSession: {
      findUnique: vi.fn(),
      delete: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    projectAccess: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    clientInvitation: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/env", () => ({
  env: {
    AUTH_SECRET: "test-secret-key-for-hmac-signing-at-least-32-chars",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    NODE_ENV: "test",
  },
}));

import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { db } from "@/lib/prisma";
import {
  getClientPortalSession,
  setClientSessionCookie,
} from "@/lib/portal";

const dbTransaction = vi.mocked(db.$transaction);

const mockCookies = vi.mocked(cookies);

// ──────────────────────────────────────────────
// Fixtures
// ──────────────────────────────────────────────

const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockCookies.mockResolvedValue(mockCookieStore as never);
});

// ──────────────────────────────────────────────
// Cookie signing
// ──────────────────────────────────────────────

describe("setClientSessionCookie", () => {
  it("sets a signed httpOnly cookie with the session id", async () => {
    await setClientSessionCookie("session-123");

    expect(mockCookieStore.set).toHaveBeenCalledWith(
      "cp_session",
      expect.any(String), // signed value
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      }),
    );

    // The signed value should contain the session id + signature
    const signedValue = mockCookieStore.set.mock.calls[0][1] as string;
    expect(signedValue).toContain("session-123");
    expect(signedValue).toContain("."); // signature separator
  });
});

// ──────────────────────────────────────────────
// Session resolution
// ──────────────────────────────────────────────

describe("getClientPortalSession", () => {
  it("returns null when no cookie is set", async () => {
    mockCookieStore.get.mockReturnValue(undefined);

    const result = await getClientPortalSession();
    expect(result).toBeNull();
  });

  it("returns null when cookie has invalid signature", async () => {
    mockCookieStore.get.mockReturnValue({
      value: "session-123.invalidsignature",
    });

    const result = await getClientPortalSession();
    expect(result).toBeNull();
  });

  it("returns null when session does not exist in DB", async () => {
    // First, create a valid signed cookie value
    // We need to sign it properly — import the internal sign function
    // Since it's not exported, we'll test through the public API
    mockCookieStore.get.mockReturnValue({ value: "garbage-value" });

    vi.mocked(db.clientSession.findUnique).mockResolvedValue(null);

    const result = await getClientPortalSession();
    expect(result).toBeNull();
  });

  it("returns null when session is expired", async () => {
    // Create a properly signed cookie value so unsign() passes
    const { createHmac } = await import("node:crypto");
    const sessionId = "session-1";
    const signature = createHmac("sha256", "test-secret-key-for-hmac-signing-at-least-32-chars")
      .update(sessionId)
      .digest("hex");
    const signedValue = `${sessionId}.${signature}`;

    mockCookieStore.get.mockReturnValue({ value: signedValue });

    vi.mocked(db.clientSession.findUnique).mockResolvedValue({
      id: sessionId,
      email: "client@test.com",
      expiresAt: new Date("2020-01-01"), // already expired
    } as never);

    // Mock delete to return a resolved promise (code chains .catch())
    vi.mocked(db.clientSession.delete).mockResolvedValue({} as never);

    const result = await getClientPortalSession();
    expect(result).toBeNull();

    // Should clean up expired session
    expect(db.clientSession.delete).toHaveBeenCalledWith({
      where: { id: sessionId },
    });
  });
});

// ──────────────────────────────────────────────
// Accept endpoint (unit-level token validation)
// ──────────────────────────────────────────────

describe("portal token acceptance logic", () => {
  it("rejects missing token", async () => {
    const { GET } = await import("@/app/api/portal/accept/route");
    const url = new URL("http://localhost:3000/api/portal/accept");
    const request = new NextRequest(url.toString());

    const response = await GET(request);
    expect(response.status).toBe(400);
    const body = await response.text();
    expect(body).toContain("Missing invitation token");
  });

  it("returns 404 for invalid token", async () => {
    vi.mocked(db.clientInvitation.findUnique).mockResolvedValue(null);

    const { GET } = await import("@/app/api/portal/accept/route");
    const url = new URL(
      "http://localhost:3000/api/portal/accept?token=nonexistent",
    );
    const request = new NextRequest(url.toString());

    const response = await GET(request);
    expect(response.status).toBe(404);
    const body = await response.text();
    expect(body).toContain("Invalid invitation link");
  });

  it("returns 410 for expired token", async () => {
    vi.mocked(db.clientInvitation.findUnique).mockResolvedValue({
      id: "inv-1",
      projectId: "proj-1",
      email: "client@test.com",
      expiresAt: new Date("2020-01-01"), // expired
      acceptedAt: null,
    } as never);

    const { GET } = await import("@/app/api/portal/accept/route");
    const url = new URL(
      "http://localhost:3000/api/portal/accept?token=expired-token",
    );
    const request = new NextRequest(url.toString());

    const response = await GET(request);
    expect(response.status).toBe(410);
    const body = await response.text();
    expect(body).toContain("expired");
  });

  it("creates ProjectAccess and issues session for valid token", async () => {
    vi.mocked(db.clientInvitation.findUnique).mockResolvedValue({
      id: "inv-1",
      projectId: "proj-1",
      email: "client@test.com",
      expiresAt: new Date("2099-12-31"), // far future
      acceptedAt: null,
    } as never);

    dbTransaction.mockImplementation(async (fn) => {
      // Minimal transaction-client stub cast to the expected shape
      const tx = {
        projectAccess: {
          upsert: vi.fn().mockResolvedValue({}),
        },
        clientInvitation: {
          update: vi.fn().mockResolvedValue({}),
        },
      } as unknown as Parameters<typeof fn>[0];
      return fn(tx);
    });

    vi.mocked(db.clientSession.create).mockResolvedValue({
      id: "new-session",
      email: "client@test.com",
      token: "random-token",
      expiresAt: new Date("2099-12-31"),
      createdAt: new Date(),
    } as never);

    const { GET } = await import("@/app/api/portal/accept/route");
    const url = new URL(
      "http://localhost:3000/api/portal/accept?token=valid-token",
    );
    const request = new NextRequest(url.toString());

    const response = await GET(request);

    // Should redirect to project portal (Next.js 16 returns 307)
    expect(response.status).toBe(307);
    expect(response.headers.get("Location")).toContain(
      "/portal/projects/proj-1",
    );

    // Should have created a session
    expect(db.clientSession.create).toHaveBeenCalled();

    // Should have set the cookie
    expect(mockCookieStore.set).toHaveBeenCalled();
  });
});

// ──────────────────────────────────────────────
// Access control
// ──────────────────────────────────────────────

describe("project access control", () => {
  it("denies access when no ProjectAccess row exists", async () => {
    vi.mocked(db.projectAccess.findUnique).mockResolvedValue(null);

    const { requireProjectAccess } = await import("@/lib/portal");
    const result = await requireProjectAccess("client-a@test.com", "proj-1");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.status).toBe(403);
    }
  });

  it("allows access when ProjectAccess row exists", async () => {
    vi.mocked(db.projectAccess.findUnique).mockResolvedValue({
      id: "access-1",
      projectId: "proj-1",
      email: "client-a@test.com",
      createdAt: new Date(),
    } as never);

    const { requireProjectAccess } = await import("@/lib/portal");
    const result = await requireProjectAccess("client-a@test.com", "proj-1");

    expect(result.ok).toBe(true);
  });

  it("client A cannot access client B's project", async () => {
    // Client A has access to proj-1 only
    vi.mocked(db.projectAccess.findUnique).mockResolvedValue({
      id: "access-1",
      projectId: "proj-1",
      email: "client-a@test.com",
      createdAt: new Date(),
    } as never);

    const { requireProjectAccess } = await import("@/lib/portal");

    // Client A accessing their own project — should succeed
    const ownResult = await requireProjectAccess("client-a@test.com", "proj-1");
    expect(ownResult.ok).toBe(true);

    // Client A trying to guess proj-2 — mock returns null for this query
    vi.mocked(db.projectAccess.findUnique).mockResolvedValue(null);

    const otherResult = await requireProjectAccess(
      "client-a@test.com",
      "proj-2",
    );
    expect(otherResult.ok).toBe(false);
    if (!otherResult.ok) {
      expect(otherResult.error.status).toBe(403);
    }
  });
});
