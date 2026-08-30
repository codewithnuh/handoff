import { redirect } from "next/navigation";
import Link from "next/link";
import { requireClientSession } from "@/lib/portal";
import { ClientLogoutButton } from "../logout-button";
import Image from "next/image";

/**
 * Authenticated portal layout — all /portal/* pages that render client
 * project data require a valid client session. Unauthenticated visitors
 * are redirected to /portal/expired (which lives outside this group).
 */
// Session-scoped: reads the signed client-session cookie on every request.
export const dynamic = "force-dynamic";

export default async function PortalClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireClientSession();

  if (!session.ok) {
    redirect("/portal/expired");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/portal"
              className="flex items-center gap-0.5 text-foreground transition-opacity hover:opacity-80"
              aria-label="Handoff home"
            >
              <Image
                src="/logo.png"
                width={32}
                height={32}
                alt=""
                aria-hidden="true"
                className="size-8 object-contain"
                priority
              />

              <span className="font-heading text-xl font-semibold leading-none tracking-[-0.025em]">
                Handoff
              </span>
            </Link>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              ·
            </span>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Client Portal
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {session.email}
            </span>
            <ClientLogoutButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border py-4">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 text-center">
          <p className="text-xs text-muted-foreground">
            Powered by{" "}
            <span className="font-medium text-foreground">Handoff</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
