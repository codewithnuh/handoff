import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Lightweight route protection.
 *
 * The proxy runs before every matched request and CANNOT query the
 * database or resolve real sessions — a present cookie may be stale
 * (expired, revoked, or wiped), so it must NEVER be trusted to redirect
 * signed-in users away from /login or /register: an invalid cookie would
 * trap them in a /login ↔ /dashboard redirect loop.
 *
 * Therefore the proxy only short-circuits one direction:
 *  - signed-out visitors (no cookie at all) hitting /dashboard go to /login
 *
 * Real verification happens in server components/actions via
 * requireAuth/requireWorkspace, so a forged or stale cookie gains nothing.
 */

const BETTER_AUTH_SESSION_COOKIE_PREFIX = "better-auth.session_token";

const protectedRoutes = ["/dashboard"];

export default function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  const isProtectedRoute = protectedRoutes.some((route) =>
    path.startsWith(route),
  );

  // Cookie presence is a cheap heuristic; validity is verified server-side.
  // In production the secure variant gets a __Secure- prefix.
  const hasSessionCookie =
    request.cookies.has(BETTER_AUTH_SESSION_COOKIE_PREFIX) ||
    request.cookies.has(`__Secure-${BETTER_AUTH_SESSION_COOKIE_PREFIX}`);

  if (!hasSessionCookie && isProtectedRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
