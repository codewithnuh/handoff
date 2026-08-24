import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { issueClientSession } from "@/lib/portal";

/**
 * GET /api/portal/accept?token=...
 *
 * Accepts a client invitation token:
 * 1. Validates the token exists, is unexpired, and hasn't been accepted
 * 2. Creates (or no-ops) a ProjectAccess row for email+project
 * 3. Issues a ClientSession and sets a signed httpOnly cookie
 * 4. Redirects to the project portal page
 *
 * Expired / already-used / invalid tokens show a clear error page.
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

  // 3. Create ProjectAccess + mark invitation as accepted (idempotent)
  const alreadyAccepted = invitation.acceptedAt !== null;

  if (!alreadyAccepted) {
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
  }

  // 4. Issue a fresh ClientSession + set the signed cookie
  await issueClientSession(invitation.email);

  // 5. Redirect to the project portal page
  const projectUrl = `${new URL(request.url).origin}/portal/projects/${invitation.projectId}`;
  return NextResponse.redirect(projectUrl);
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
