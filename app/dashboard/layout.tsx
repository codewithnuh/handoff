import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/dashboard/sidebar";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { type ReactNode } from "react";
import { requireWorkspace } from "@/lib/actions/guards";
import { listWorkspaces } from "@/lib/actions/workspace";

// Session-scoped: every dashboard page reads the auth session.
export const dynamic = "force-dynamic";

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
        isAdmin={guard.value.isOwner || guard.value.isAdmin}
        workspaces={workspaces.success ? workspaces.data.items : []}
      />

      <SidebarInset>
        {" "}
        <div className="flex items-center gap-2">
          <SidebarTrigger size={"lg"} className="md:hidden" />
        </div>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
