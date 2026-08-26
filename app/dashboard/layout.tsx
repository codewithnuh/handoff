import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/dashboard/sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { type ReactNode } from "react";
import { requireWorkspace } from "@/lib/actions/guards";

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

  return (
    <SidebarProvider>
      <AppSidebar isAdmin={guard.value.isOwner || guard.value.isAdmin} />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
