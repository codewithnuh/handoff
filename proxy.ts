import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Lightweight route protection.
 *
 * The proxy runs before every matched request and CANNOT query the
 * database or resolve real sessions — so it only checks for the presence
 * of the Better Auth session cookie to short-circuit obvious cases:
 *  - signed-out users hitting /dashboard are bounced to /login
 *  - signed-in users hitting /login or /register skip straight to /dashboard
 *
 * Real verification still happens in server components/actions via
 * requireAuth/requireWorkspace, so a forged cookie gains nothing.
 */

const BETTER_AUTH_SESSION_COOKIE_PREFIX = "better-auth.session_token";

const protectedRoutes = ["/dashboard"];
const authRoutes = ["/login", "/register"];

export default function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  const isProtectedRoute = protectedRoutes.some((route) =>
    path.startsWith(route),
  );
  const isAuthRoute = authRoutes.includes(path);

  // Cookie presence is a cheap heuristic; validity is verified server-side.
  // In production the secure variant gets a __Secure- prefix.
  const hasSessionCookie =
    request.cookies.has(BETTER_AUTH_SESSION_COOKIE_PREFIX) ||
    request.cookies.has(`__Secure-${BETTER_AUTH_SESSION_COOKIE_PREFIX}`);

  if (hasSessionCookie && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!hasSessionCookie && isProtectedRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/register"],
};
