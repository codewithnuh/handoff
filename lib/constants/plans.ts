/**
 * Plan-specific resource limits.
 *
 * FREE: 1 workspace, up to 3 projects — enough to deliver real work and
 *       feel the product, tight enough that growth means upgrading.
 * PRO ($12/mo): 5 workspaces, up to 100 projects each — for studios
 *       running many clients in parallel.
 *
 * When a paid user cancels, they enter a 30-day grace period
 * (stored in Subscription.gracePeriodEndsAt). After the grace period,
 * the workspace becomes read-only and effective limits drop to FREE tier.
 */
export const PLAN_LIMITS = {
  FREE: {
    maxWorkspaces: 1,
    maxProjectsPerWorkspace: 3,
  },
  PRO: {
    maxWorkspaces: 5,
    maxProjectsPerWorkspace: 100,
  },
} as const;

export type PlanKey = keyof typeof PLAN_LIMITS;

/**
 * Returns the plan key for a given subscription plan string.
 */
export function getPlanKey(plan: string): PlanKey {
  return plan === "PRO" ? "PRO" : "FREE";
}
