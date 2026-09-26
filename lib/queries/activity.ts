/**
 * Server-side data access layer for recent activity queries.
 *
 * These functions run directly in Server Components — no server-action
 * boilerplate (validation, revalidation, action-response wrappers).
 * Every function starts with the workspace auth guard so we never
 * leak data across tenants.
 */

import { db } from "@/lib/prisma";
import { getContext, projectScope } from "@/lib/queries/context";

// ──────────────────────────────────────────────
// Dashboard Recent Activity — workspace-wide feed
// ──────────────────────────────────────────────

export type RecentActivityItem = {
  id: string;
  type: string;
  actorName: string | null;
  actorEmail: string | null;
  /** Client actions have actorEmail but no actorUserId */
  isClientAction: boolean;
  projectName: string;
  projectId: string;
  createdAt: Date;
};

/**
 * Returns the latest activities across all projects in the workspace,
 * including client actions (approvals, change requests, comments).
 * Used by the dashboard home so freelancer-side work and client
 * activity both surface in one feed.
 */
export async function getRecentWorkspaceActivity(
  take = 15,
): Promise<RecentActivityItem[]> {
  const ctx = await getContext();
  const scope = await projectScope(ctx);

  const activities = await db.activity.findMany({
    where: { project: scope },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      type: true,
      actorName: true,
      actorEmail: true,
      actorUserId: true,
      createdAt: true,
      project: { select: { id: true, name: true } },
    },
  });

  return activities.map((a) => ({
    id: a.id,
    type: a.type,
    actorName: a.actorName,
    actorEmail: a.actorEmail,
    isClientAction: !a.actorUserId,
    projectName: a.project.name,
    projectId: a.project.id,
    createdAt: a.createdAt,
  }));
}
