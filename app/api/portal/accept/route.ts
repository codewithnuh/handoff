import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { INVITE_TTL_MS } from "@/lib/constants/invitations";
import {
  issueClientSession,
  getClientPortalSession,
  buildClientSessionCookieHeader,
} from "@/lib/portal";

/**
 * GET /api/portal/accept?token=...
 *
 * Accepts a client invitation token:
 * 1. Validates the token exists, is unexpired, and hasn't been consumed
 * 2. If the user already has an active session, redirect to the project
 *    (the entry URL works as a convenience redirect)
 * 3. If no active session and token is unconsumed, create ProjectAccess,
 *    mark invitation as accepted, issue a session, and redirect
 * 4. If no active session and token is already consumed, show session-expired
 *    page (they need a new link)
 *
 * Magic links are single-use for authentication. A consumed token cannot
 * establish a new session. The active session is what grants access.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token || typeof token !== "string") {
    return errorResponse("Missing invitation token.", 400);
  }

  // 1. Look up the invitation by token
  const invitation = await db.clientInvitation.findUnique({
    where: { token },
    select: {
      id: true,
      projectId: true,
      email: true,
      expiresAt: true,
      acceptedAt: true,
    },
  });

  if (!invitation) {
    return errorResponse("Invalid invitation link.", 404);
  }

  // 2. Check expiry
  if (invitation.expiresAt <= new Date()) {
    return errorResponse(
      "This invitation link has expired. Please ask the project owner to send a new one.",
      410,
    );
  }

  // 3. Check if the user already has an active client portal session
  const existingSession = await getClientPortalSession();

  if (existingSession) {
    // Active session exists — verify this session's email matches the invitation
    if (existingSession.email.toLowerCase() === invitation.email.toLowerCase()) {
      // Same client — redirect to the project (entry URL works as convenience)
      const projectUrl = `${new URL(request.url).origin}/portal/projects/${invitation.projectId}`;
      return NextResponse.redirect(projectUrl);
    }
    // Different email — don't hijack the existing session, show error
    return errorResponse(
      "This invitation is for a different email address. Please sign out first and try again.",
      403,
    );
  }

  // 4. No active session — check if this token was already consumed
  if (invitation.acceptedAt !== null) {
    // Token already consumed — cannot establish a new session.
    // Per improvements.md: consumed magic link cannot create a new session.
    // Direct them to request a new link.
    return NextResponse.redirect(
      `${new URL(request.url).origin}/portal/expired`,
    );
  }

  // 5. Token is unconsumed and valid — create access + issue session
  await db.$transaction(async (tx) => {
    await tx.projectAccess.upsert({
      where: {
        projectId_email: {
          projectId: invitation.projectId,
          email: invitation.email,
        },
      },
      create: {
        projectId: invitation.projectId,
        email: invitation.email,
      },
      update: {},
    });

    await tx.clientInvitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });
  });

  // Issue a fresh ClientSession
  const session = await db.clientSession.create({
    data: {
      email: invitation.email,
      token: crypto.randomUUID(),
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    },
  });

  // Build the redirect response and set the cookie directly on it.
  // This avoids a known Next.js issue where cookies().set() in route
  // handlers doesn't reliably merge with NextResponse.redirect().
  const projectUrl = `${new URL(request.url).origin}/portal/projects/${invitation.projectId}`;
  const response = NextResponse.redirect(projectUrl);
  response.headers.append(
    "Set-Cookie",
    buildClientSessionCookieHeader(session.id),
  );
  return response;
}

// ──────────────────────────────────────────────
// Error page HTML
// ──────────────────────────────────────────────

function errorResponse(message: string, status: number): NextResponse {
  return new NextResponse(errorPage(message), {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function errorPage(message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Invitation Error</title>
<style>
  body{font-family:system-ui,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#fafafa}
  .card{background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:2rem;max-width:400px;text-align:center}
  h1{font-size:1.25rem;margin:0 0 .5rem;color:#111}
  p{color:#6b7280;font-size:.875rem;margin:0 0 1rem}
</style>
</head>
<body>
  <div class="card">
    <h1>Invitation Error</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}
