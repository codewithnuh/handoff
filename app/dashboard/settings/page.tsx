import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import { requireWorkspacePermission } from "@/lib/access";
import { SettingsForm } from "@/components/dashboard/settings-form";
import { PageHeader } from "@/components/dashboard/page-header";

export const metadata = { title: "Settings — Handoff" };

export default async function SettingsPage() {
  const guard = await requireWorkspacePermission("MANAGE_WORKSPACE");
  if (!guard.ok) {
    redirect(guard.error.error.code === "UNAUTHORIZED" ? "/login" : "/dashboard");
  }

  const user = await db.user.findUnique({
    where: { id: guard.value.user.id },
    select: { name: true, email: true },
  });

  const role = guard.value.isOwner
    ? ("OWNER" as const)
    : guard.value.isAdmin
      ? ("ADMIN" as const)
      : null;

  // Regular members: read their WorkspaceMember role
  let memberRole: "MEMBER" | null = null;
  if (!role) {
    const membership = await db.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: guard.value.workspace.id,
          userId: guard.value.user.id,
        },
      },
      select: { role: true },
    });
    memberRole = membership ? "MEMBER" : null;
  }

  return (
    <div className="workspace-page space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your profile, security, and workspace details."
      />

      <SettingsForm
        name={user?.name ?? ""}
        email={user?.email ?? ""}
        workspaceRole={
          role ?? (memberRole ? "MEMBER" : null)
        }
        workspaceName={guard.value.workspace.name}
      />
    </div>
  );
}
