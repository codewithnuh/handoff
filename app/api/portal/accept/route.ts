import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import {
  buildClientSessionCookieHeader,
  getClientPortalSession,
  replaceClientSession,
} from "@/lib/portal";

/**
 * GET displays a confirmation form. Email link scanners commonly follow GET
 * links, so this request must never consume the invitation or create a session.
 */
export async function GET(request: NextRequest) {
  const token = new URL(request.url).searchParams.get("token")?.trim();
  if (!token) return errorResponse("Missing invitation token.", 400);
  if (token.length > 128) return errorResponse("Invalid invitation link.", 404);

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
  if (!invitation) return errorResponse("Invalid invitation link.", 404);
  if (invitation.expiresAt <= new Date()) {
    return errorResponse(
      "This invitation link has expired. Please ask the project owner to send a new one.",
      410,
    );
  }

  const session = await getClientPortalSession();
  if (session) {
    if (session.email.toLowerCase() !== invitation.email.toLowerCase()) {
      return errorResponse(
        "This invitation is for a different email address. Please sign out first and try again.",
        403,
      );
    }

    const access = await db.projectAccess.findUnique({
      where: {
        projectId_email: {
          projectId: invitation.projectId,
          email: session.email,
        },
      },
      select: { id: true },
    });
    if (access) return projectRedirect(request, invitation.projectId);
  }

  if (invitation.acceptedAt) {
    return NextResponse.redirect(new URL("/portal/expired", request.url));
  }

  return new NextResponse(confirmationPage(token), {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

/** Claims the token, grants access, and creates a session in one transaction. */
export async function POST(request: NextRequest) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return errorResponse("Invalid invitation submission.", 400);
  }

  const formToken = form.get("token");
  const token = typeof formToken === "string" ? formToken.trim() : "";
  if (!token) return errorResponse("Missing invitation token.", 400);
  if (token.length > 128) return errorResponse("Invalid invitation link.", 404);

  const session = await getClientPortalSession();
  const now = new Date();
  const outcome = await db.$transaction(async (tx) => {
    const invitation = await tx.clientInvitation.findUnique({
      where: { token },
      select: {
        id: true,
        projectId: true,
        email: true,
        expiresAt: true,
        acceptedAt: true,
      },
    });

    if (!invitation) return { type: "invalid" as const };
    if (invitation.expiresAt <= now) return { type: "expired" as const };
    if (session && session.email.toLowerCase() !== invitation.email.toLowerCase()) {
      return { type: "mismatch" as const };
    }

    const existingAccess = session
      ? await tx.projectAccess.findUnique({
          where: {
            projectId_email: {
              projectId: invitation.projectId,
              email: session.email,
            },
          },
          select: { id: true },
        })
      : null;

    if (invitation.acceptedAt) {
      return existingAccess
        ? { type: "authorized" as const, projectId: invitation.projectId }
        : { type: "used" as const };
    }

    const claim = await tx.clientInvitation.updateMany({
      where: {
        id: invitation.id,
        acceptedAt: null,
        expiresAt: { gt: now },
      },
      data: { acceptedAt: now },
    });
    if (claim.count !== 1) return { type: "used" as const };

    await tx.projectAccess.upsert({
      where: {
        projectId_email: {
          projectId: invitation.projectId,
          email: session?.email ?? invitation.email,
        },
      },
      create: {
        projectId: invitation.projectId,
        email: session?.email ?? invitation.email,
      },
      update: {},
    });

    if (session) {
      return { type: "accepted" as const, projectId: invitation.projectId };
    }

    const createdSession = await replaceClientSession(
      tx,
      invitation.email,
    );

    return {
      type: "accepted" as const,
      projectId: invitation.projectId,
      sessionId: createdSession.id,
    };
  });

  if (outcome.type === "invalid") {
    return errorResponse("Invalid invitation link.", 404);
  }
  if (outcome.type === "expired" || outcome.type === "used") {
    return NextResponse.redirect(new URL("/portal/expired", request.url));
  }
  if (outcome.type === "mismatch") {
    return errorResponse(
      "This invitation is for a different email address. Please sign out first and try again.",
      403,
    );
  }
  if (outcome.type === "authorized") {
    return projectRedirect(request, outcome.projectId);
  }

  const response = projectRedirect(request, outcome.projectId, 303);
  if (outcome.sessionId) {
    response.headers.append(
      "Set-Cookie",
      buildClientSessionCookieHeader(outcome.sessionId),
    );
  }
  return response;
}

function projectRedirect(
  request: NextRequest,
  projectId: string,
  status = 307,
): NextResponse {
  const url = new URL(`/portal/projects/${projectId}`, request.url);
  return NextResponse.redirect(url, status);
}

function errorResponse(message: string, status: number): NextResponse {
  return new NextResponse(errorPage(message), {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function confirmationPage(token: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Accept invitation</title>
<style>
  body{font-family:system-ui,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#fafafa}
  .card{background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:2rem;max-width:400px;text-align:center}
  h1{font-size:1.25rem;margin:0 0 .5rem;color:#111}
  p{color:#6b7280;font-size:.875rem;margin:0 0 1rem}
  button{border:0;border-radius:6px;padding:.7rem 1rem;background:#111;color:#fff;font:inherit;cursor:pointer}
</style>
</head>
<body>
  <main class="card">
    <h1>Accept your invitation</h1>
    <p>Continue to the shared project portal.</p>
    <form method="post" action="/api/portal/accept">
      <input type="hidden" name="token" value="${escapeHtml(token)}">
      <button type="submit">Accept invitation</button>
    </form>
  </main>
</body>
</html>`;
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
<body><main class="card"><h1>Invitation Error</h1><p>${escapeHtml(message)}</p></main></body>
</html>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}
