"use client";

/**
 * TeamManagement — workspace members, pending invites, and per-project
 * assignments (need-to-know scoping).
 *
 * Admins/owner see everything; regular members see the roster read-only.
 * Leads manage assignments only for the projects they lead.
 */

import type { TeamMemberListResult, TeamInviteListResult } from "@/lib/actions/team";
import type { TeamAssignmentProject } from "@/lib/queries/project";
import type { WorkspacePermission } from "@/app/generated/prisma/client";
import { MembersSection } from "@/components/dashboard/team/members-section";
import { InvitesSection } from "@/components/dashboard/team/invites-section";
import { AssignmentsSection } from "@/components/dashboard/team/assignments-section";

type Member = TeamMemberListResult["items"][number];
type Invite = TeamInviteListResult["items"][number];

interface TeamManagementProps {
  members: Member[];
  invites: Invite[];
  isAdmin: boolean;
  currentUserId: string;
  manageableProjects: TeamAssignmentProject[];
  permissions?: WorkspacePermission[];
}

export function TeamManagement({
  members,
  invites,
  isAdmin,
  currentUserId,
  manageableProjects,
  permissions = [],
}: TeamManagementProps) {
  const canManageMembers = isAdmin || permissions.includes("MANAGE_MEMBERS");

  return (
    <div className="space-y-6">
      <MembersSection
        members={members}
        isAdmin={isAdmin}
        currentUserId={currentUserId}
        permissions={permissions}
      />
      {canManageMembers && (
        <InvitesSection projects={manageableProjects} invites={invites} />
      )}

      {manageableProjects.length > 0 && (
        <AssignmentsSection projects={manageableProjects} members={members} />
      )}
    </div>
  );
}
