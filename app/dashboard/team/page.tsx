import { redirect } from "next/navigation";
import { requireWorkspacePermission } from "@/lib/actions/guards";
import { listTeamMembers, listTeamInvites } from "@/lib/actions/team";
import { getManageableProjects } from "@/lib/queries/project";
import { TeamManagement } from "@/components/dashboard/team";

export const metadata = { title: "Team — Handoff" };

export default async function TeamPage() {
  const guard = await requireWorkspacePermission("MANAGE_MEMBERS");
  if (!guard.ok) {
    redirect(guard.error.error.code === "UNAUTHORIZED" ? "/login" : "/dashboard");
  }

  const { user, isOwner, isAdmin, permissions } = guard.value;
  const canManageMembers = isAdmin || permissions.includes("MANAGE_MEMBERS");

  const [membersResult, invitesResult, manageable] = await Promise.all([
    listTeamMembers(),
    canManageMembers ? listTeamInvites() : Promise.resolve({ success: true, data: { items: [] } }),
    getManageableProjects(),
  ]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Team</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Invite teammates, set their standing, and control which projects they
          can see.
        </p>
      </div>

      <TeamManagement
        members={membersResult.success ? membersResult.data.items : []}
        invites={
          invitesResult && invitesResult.success ? invitesResult.data.items : []
        }
        isAdmin={isOwner || isAdmin}
        currentUserId={user.id}
        manageableProjects={manageable.projects}
        permissions={permissions}
      />
    </div>
  );
}
