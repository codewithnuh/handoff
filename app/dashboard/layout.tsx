import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/dashboard/sidebar";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { type ReactNode } from "react";
import { requireWorkspace } from "@/lib/access";
import { listWorkspaces } from "@/lib/actions/workspace";
import Link from "next/link";
import { HandoffMark } from "@/components/brand/handoff-mark";

// Session-scoped: every dashboard page reads the auth session.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function Layout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const guard = await requireWorkspace();
  if (!guard.ok) {
    redirect("/login");
  }

  // Unverified accounts must confirm their email before entering the app.
  if (!guard.value.user.emailVerified) {
    redirect("/verify-email");
  }

  const workspaces = await listWorkspaces();

  return (
    <SidebarProvider>
      <AppSidebar
        logo={
          <Link
            href="/dashboard"
            className="flex items-center gap-0.5 text-foreground transition-opacity hover:opacity-80"
            aria-label="Handoff home"
          >
            <HandoffMark size={26} className="app-brand-mark" />
            <span className="app-brand-name">Handoff</span>
          </Link>
        }
        isAdmin={guard.value.isOwner || guard.value.isAdmin}
        isOwner={guard.value.isOwner}
        permissions={guard.value.permissions}
        workspaces={workspaces.success ? workspaces.data.items : []}
      />

      <SidebarInset className="workspace-main">
        <div className="workspace-mobilebar md:hidden">
          <SidebarTrigger size="icon" aria-label="Open navigation" />
          <Link href="/dashboard" className="app-brand" aria-label="Handoff dashboard">
            <HandoffMark size={26} className="app-brand-mark" />
            <span className="app-brand-name">Handoff</span>
          </Link>
        </div>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
