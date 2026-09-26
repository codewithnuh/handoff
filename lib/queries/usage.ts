/**
 * Server-side data access layer for workspace usage queries.
 *
 * These functions run directly in Server Components — no server-action
 * boilerplate (validation, revalidation, action-response wrappers).
 * Every function starts with the workspace auth guard so we never
 * leak data across tenants.
 */

import { db } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/access";
import { getEffectivePlan } from "@/lib/services/plan-limits";
import type { PlanKey } from "@/lib/constants/plans";

// ──────────────────────────────────────────────
// Workspace Usage (for dashboard banners)
// ──────────────────────────────────────────────

export type WorkspaceUsageData = {
  plan: PlanKey;
  isDowngraded: boolean;
  /** ISO string — Date objects are not serializable across RSC → client boundary */
  gracePeriodEndsAt: string | null;
  /** Whole days left in the downgrade grace period (0 when expired/absent) */
  gracePeriodDaysLeft: number;
  projects: { used: number; max: number; percent: number };
  workspaces: { used: number; max: number; percent: number };
};

/**
 * Returns current workspace usage stats against plan limits.
 * Used by the dashboard to show usage banners and upgrade CTAs.
 */
export async function getWorkspaceUsage(): Promise<WorkspaceUsageData | null> {
  const guard = await requireWorkspace();
  if (!guard.ok) return null;
  const workspaceId = guard.value.workspace.id;
  const userId = guard.value.user.id;

  const [effective, projectCount, workspaceCount] = await Promise.all([
    getEffectivePlan(userId),
    db.project.count({ where: { workspaceId } }),
    db.workspace.count({ where: { ownerId: userId } }),
  ]);

  const maxProjects = effective.limits.maxProjectsPerWorkspace;
  const maxWorkspaces = effective.limits.maxWorkspaces;

  return {
    plan: effective.plan,
    isDowngraded: effective.isDowngraded,
    gracePeriodEndsAt: effective.gracePeriodEndsAt?.toISOString() ?? null,
    gracePeriodDaysLeft: effective.gracePeriodEndsAt
      ? Math.max(
          0,
          Math.ceil(
            (effective.gracePeriodEndsAt.getTime() - Date.now()) /
              (1000 * 60 * 60 * 24),
          ),
        )
      : 0,
    projects: {
      used: projectCount,
      max: maxProjects,
      percent: Math.min(Math.round((projectCount / maxProjects) * 100), 100),
    },
    workspaces: {
      used: workspaceCount,
      max: maxWorkspaces,
      percent: Math.min(
        Math.round((workspaceCount / maxWorkspaces) * 100),
        100,
      ),
    },
  };
}
