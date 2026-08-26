import { redirect } from "next/navigation";
import { requireWorkspace } from "@/lib/actions/guards";
import { listTeamMembers, listTeamInvites } from "@/lib/actions/team";
import { getManageableProjects } from "@/lib/queries/project";
import { TeamManagement } from "@/components/dashboard/team-management";

export const metadata = { title: "Team — Handoff" };

export default async function TeamPage() {
  const guard = await requireWorkspace();
  if (!guard.ok) {
    redirect("/login");
  }

  const { user, isOwner, isAdmin } = guard.value;

  const [membersResult, invitesResult, manageable] = await Promise.all([
    listTeamMembers(),
    isAdmin ? listTeamInvites() : Promise.resolve(null),
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
      />
    </div>
  );
}
