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
import Link from "next/link";
import Image from "next/image";

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
        logo={
          <Link
            href="/dashboard"
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

            <span className="font-heading text-xl text-white font-semibold leading-none tracking-[-0.025em]">
              Handoff
            </span>
          </Link>
        }
        isAdmin={guard.value.isOwner || guard.value.isAdmin}
        isOwner={guard.value.isOwner}
        permissions={guard.value.permissions}
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
