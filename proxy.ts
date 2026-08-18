import { getSession } from "./lib/actions/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedRoutes = ["/dashboard"];
const publicRoutes = ["/login", "/signup", "/"];

export default async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  const isProtectedRoute = protectedRoutes.some((route) =>
    path.startsWith(route),
  );

  const isPublicRoute = publicRoutes.includes(path);

  const session = await getSession();

  const isUserLoggedIn = session.success && !!session.data?.session;

  console.log("Path:", path);
  console.log("Logged in:", isUserLoggedIn);

  // Logged-in user trying to access login/signup
  if (isUserLoggedIn && (path === "/login" || path === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Logged-out user trying to access protected route
  if (!isUserLoggedIn && isProtectedRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup", "/"],
};
