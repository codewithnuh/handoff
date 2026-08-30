/**
 * Client portal authentication utilities (server-only).
 *
 * Strategy:
 * - ClientSession.id is stored in a signed httpOnly cookie (not the raw token).
 * - The cookie is signed with AUTH_SECRET to prevent tampering.
 * - On every portal request: cookie → ClientSession lookup → email resolution
 *   → ProjectAccess check for the specific projectId in the URL.
 *
 * This is NOT a "use server" file — these helpers must never become
 * remotely-callable endpoints. Client-invokable portal actions live in
 * lib/actions/portal-actions.ts and lib/actions/portal-session.ts.
 */

import "server-only";

import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/prisma";
import { env } from "@/env";

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

export const CLIENT_COOKIE_NAME = "cp_session";
export const CLIENT_SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const SIGNATURE_SEPARATOR = ".";

// ──────────────────────────────────────────────
// Cookie signing / verification
// ──────────────────────────────────────────────

function sign(value: string): string {
  const signature = createHmac("sha256", env.AUTH_SECRET)
    .update(value)
    .digest("hex");
  return `${value}${SIGNATURE_SEPARATOR}${signature}`;
}

/** Verifies a signed cookie value and returns the original (session id). */
export function unsignClientCookie(signed: string): string | null {
  const idx = signed.lastIndexOf(SIGNATURE_SEPARATOR);
  if (idx === -1) return null;

  const value = signed.slice(0, idx);
  const signature = signed.slice(idx + 1);

  const expected = createHmac("sha256", env.AUTH_SECRET)
    .update(value)
    .digest("hex");

  // Timing-safe comparison to prevent timing attacks
  try {
    const sigBuf = Buffer.from(signature, "hex");
    const expBuf = Buffer.from(expected, "hex");
    if (sigBuf.length !== expBuf.length) return null;
    return timingSafeEqual(sigBuf, expBuf) ? value : null;
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────
// Cookie helpers
// ──────────────────────────────────────────────

/** Builds the Set-Cookie header value for the client session cookie. */
export function buildClientSessionCookieHeader(sessionId: string): string {
  const parts = [
    `${CLIENT_COOKIE_NAME}=${sign(sessionId)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${CLIENT_SESSION_MAX_AGE}`,
  ];
  if (env.NODE_ENV === "production") {
    parts.push("Secure");
  }
  return parts.join("; ");
}

/** Sets the signed client-session cookie. Safe in Server Components & Server Actions. */
export async function setClientSessionCookie(sessionId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(CLIENT_COOKIE_NAME, sign(sessionId), {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: CLIENT_SESSION_MAX_AGE,
    path: "/",
  });
}

// ──────────────────────────────────────────────
// Session resolution
// ──────────────────────────────────────────────

export type ClientPortalSession = {
  sessionId: string;
  email: string;
};

/**
 * Reads the signed cookie, looks up the ClientSession, and returns
 * the resolved email. Returns null when not authenticated.
 */
export async function getClientPortalSession(): Promise<ClientPortalSession | null> {
  const cookieStore = await cookies();
  const signed = cookieStore.get(CLIENT_COOKIE_NAME)?.value;
  if (!signed) return null;

  const sessionId = unsignClientCookie(signed);
  if (!sessionId) return null;

  const session = await db.clientSession.findUnique({
    where: { id: sessionId },
    select: { id: true, email: true, expiresAt: true },
  });

  if (!session) return null;

  // Check expiry
  if (session.expiresAt <= new Date()) {
    // Clean up expired session
    await db.clientSession.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return { sessionId: session.id, email: session.email };
}

/**
 * Creates a new ClientSession row for the given email and sets the
 * signed cookie. Used by the invitation accept endpoint.
 *
 * Before creating a new session, any existing sessions for this email
 * are cleaned up to prevent session accumulation.
 */
export async function issueClientSession(email: string): Promise<void> {
  // Clean up any existing sessions for this email to prevent accumulation
  await db.clientSession.deleteMany({
    where: { email },
  });

  const session = await db.clientSession.create({
    data: {
      email,
      token: crypto.randomUUID(),
      expiresAt: new Date(Date.now() + CLIENT_SESSION_MAX_AGE * 1000),
    },
  });
  await setClientSessionCookie(session.id);
}

/**
 * Revokes all client sessions for the given email.
 * Used when a client's project access is removed.
 */
export async function revokeClientSessions(email: string): Promise<void> {
  await db.clientSession.deleteMany({
    where: { email },
  });
}

/**
 * Revokes a specific client session by ID.
 * Used for logout.
 */
export async function revokeClientSession(sessionId: string): Promise<void> {
  await db.clientSession.delete({
    where: { id: sessionId },
  }).catch(() => {});
}

// ──────────────────────────────────────────────
// Guards
// ──────────────────────────────────────────────

export type PortalGuardResult =
  | { ok: true; email: string; sessionId: string }
  | { ok: false };

/**
 * Requires a valid client portal session.
 */
export async function requireClientSession(): Promise<PortalGuardResult> {
  const session = await getClientPortalSession();
  if (!session) return { ok: false };
  return { ok: true, email: session.email, sessionId: session.sessionId };
}

// ──────────────────────────────────────────────
// Project access
// ──────────────────────────────────────────────

export type ProjectAccessResult =
  | { ok: true }
  | { ok: false; error: { status: 403 } };

/**
 * Verifies the client has access to the specified project.
 */
export async function requireProjectAccess(
  email: string,
  projectId: string,
): Promise<ProjectAccessResult> {
  const access = await db.projectAccess.findUnique({
    where: { projectId_email: { projectId, email } },
    select: { id: true },
  });

  if (!access) {
    return { ok: false, error: { status: 403 } };
  }

  return { ok: true };
}
