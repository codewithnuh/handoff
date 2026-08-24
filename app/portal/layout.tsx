/**
 * Portal root layout — plain shell, no auth check.
 *
 * Auth is enforced in app/portal/(client)/layout.tsx so that
 * /portal/expired stays reachable when the session is missing or
 * expired (otherwise it would redirect to itself in a loop).
 */
export default function PortalRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
