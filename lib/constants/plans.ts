/**
 * Plan-specific resource limits.
 *
 * FREE: 1 workspace, up to 10 projects per workspace
 * PRO:  3 workspaces, up to 20 projects per workspace
 *
 * When a paid user cancels, they enter a 30-day grace period.
 * After the grace period, the workspace becomes read-only and
 * effective limits drop to FREE tier.
 */
export const PLAN_LIMITS = {
  FREE: {
    maxWorkspaces: 1,
    maxProjectsPerWorkspace: 10,
  },
  PRO: {
    maxWorkspaces: 3,
    maxProjectsPerWorkspace: 20,
  },
} as const;

export type PlanKey = keyof typeof PLAN_LIMITS;

/** Number of days a workspace stays writable after subscription cancellation. */
export const DOWNGRADE_GRACE_PERIOD_DAYS = 30;

/**
 * Returns the plan key for a given subscription plan string.
 */
export function getPlanKey(plan: string): PlanKey {
  return plan === "PRO" ? "PRO" : "FREE";
}
