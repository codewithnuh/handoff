import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import { requireWorkspacePermission } from "@/lib/actions/guards";
import { SettingsForm } from "@/components/dashboard/settings-form";

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
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your account, security, and workspace standing.
        </p>
      </div>

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
