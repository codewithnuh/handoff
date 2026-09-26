/**
 * Server-side data access layer for team assignment queries.
 *
 * These functions run directly in Server Components — no server-action
 * boilerplate (validation, revalidation, action-response wrappers).
 * Every function starts with the workspace auth guard so we never
 * leak data across tenants.
 */

import { db } from "@/lib/prisma";
import { getContext } from "@/lib/queries/context";

// ──────────────────────────────────────────────
// Team Page Data
// ──────────────────────────────────────────────

export type TeamAssignmentProject = {
  id: string;
  name: string;
};

/**
 * Projects whose assignments the caller may manage on the team page:
 * everything for owner/admin, only led projects for regular members.
 */
export async function getManageableProjects(): Promise<{
  projects: TeamAssignmentProject[];
}> {
  const ctx = await getContext();

  if (ctx.isAdmin) {
    const projects = await db.project.findMany({
      where: { workspaceId: ctx.workspace.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true },
    });
    return { projects };
  }

  // Leads manage the projects they lead
  const memberships = await db.projectMember.findMany({
    where: {
      userId: ctx.user.id,
      role: "LEAD",
      project: { workspaceId: ctx.workspace.id },
    },
    orderBy: { createdAt: "desc" },
    select: { project: { select: { id: true, name: true } } },
  });
  return {
    projects: memberships.map((m) => ({
      id: m.project.id,
      name: m.project.name,
    })),
  };
}
