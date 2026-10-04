import { redirect } from "next/navigation";
import { requireWorkspacePermission } from "@/lib/access";
import { listTeamMembers, listTeamInvites } from "@/lib/actions/team";
import { getManageableProjects } from "@/lib/queries/team";
import { TeamManagement } from "@/components/dashboard/team";
import { PageHeader } from "@/components/dashboard/page-header";

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
    <div className="workspace-page space-y-6">
      <PageHeader
        title="Team"
        description="Invite collaborators and choose which projects they can see."
      />

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
