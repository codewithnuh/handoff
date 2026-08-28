/**
 * Plan-limits service — single source of truth for:
 *   2.1  Limit-checking (assertCanCreateWorkspace / assertCanCreateProject)
 *   2.2  Downgrade handling (read-only lock after grace period)
 *
 * Subscription is owned by the USER, not the workspace.
 *
 * All functions return a discriminated union so callers can short-circuit
 * without try/catch. No magic numbers — limits come from lib/constants/plans.ts.
 */

import { db } from "@/lib/prisma";
import { ERROR_CODES } from "@/lib/constants/errors";
import { PLAN_LIMITS, getPlanKey } from "@/lib/constants/plans";
import type { PlanKey } from "@/lib/constants/plans";
import type { ActionError } from "@/lib/types/action";
import { ActionResponse } from "@/lib/utils/action-response";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type LimitCheckResult = { ok: true } | { ok: false; error: ActionError };

/**
 * The plan a user is effectively on right now.
 *
 * After a cancellation grace period expires, the effective plan
 * drops to FREE regardless of what the subscription row says.
 */
export type EffectivePlan = {
  /** The stored subscription plan, e.g. "PRO". */
  plan: PlanKey;

  /** Whether the grace period has expired and limits have dropped. */
  isDowngraded: boolean;

  /** When the grace period ends, null if not in grace. */
  gracePeriodEndsAt: Date | null;

  /** The limits that currently apply. */
  limits: (typeof PLAN_LIMITS)[PlanKey];
};

// ──────────────────────────────────────────────
// Internal helpers
// ──────────────────────────────────────────────

/**
 * Resolves the effective plan from a subscription row (or its absence).
 *
 * A cancelled/paused subscription past its grace period drops to FREE
 * regardless of the stored plan.
 */
function resolvePlanFromSubscription(
  subscription:
    | {
        plan: string;
        status: string;
        gracePeriodEndsAt: Date | null;
      }
    | null
    | undefined,
): {
  plan: PlanKey;
  isDowngraded: boolean;
  gracePeriodEndsAt: Date | null;
} {
  const storedPlan = getPlanKey(subscription?.plan ?? "FREE");
  const now = new Date();

  const isCanceledOrPaused =
    subscription?.status === "CANCELLED" || subscription?.status === "PAUSED";

  const graceExpired =
    isCanceledOrPaused &&
    subscription?.gracePeriodEndsAt != null &&
    subscription.gracePeriodEndsAt <= now;

  return {
    plan: graceExpired ? "FREE" : storedPlan,
    isDowngraded: graceExpired,
    gracePeriodEndsAt: subscription?.gracePeriodEndsAt ?? null,
  };
}

/**
 * Resolves the effective plan for a USER.
 *
 * Subscription belongs directly to the user.
 */
async function resolveEffectivePlan(userId: string): Promise<EffectivePlan> {
  const subscription = await db.subscription.findUnique({
    where: { userId },
    select: {
      plan: true,
      status: true,
      gracePeriodEndsAt: true,
    },
  });

  const resolved = resolvePlanFromSubscription(subscription);

  return {
    ...resolved,
    limits: PLAN_LIMITS[resolved.plan],
  };
}

/**
 * Gets the owner of a workspace.
 *
 * Used when checking workspace-scoped resources whose limits
 * are determined by the user's subscription.
 */
async function getWorkspaceOwnerId(
  workspaceId: string,
): Promise<string | null> {
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      ownerId: true,
    },
  });

  return workspace?.ownerId ?? null;
}

// ──────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────

/**
 * Returns the effective plan for a USER.
 *
 * Accounts for cancellation grace periods.
 * Use this in UI to show plan information / warnings / banners.
 */
export async function getEffectivePlan(userId: string): Promise<EffectivePlan> {
  return resolveEffectivePlan(userId);
}

/**
 * Check whether a user can create another workspace.
 *
 * The user's subscription determines how many workspaces
 * they are allowed to create.
 *
 * Called at the top of `createWorkspace`.
 */
export async function assertCanCreateWorkspace(
  userId: string,
): Promise<LimitCheckResult> {
  const [workspaceCount, effective] = await Promise.all([
    db.workspace.count({
      where: {
        ownerId: userId,
      },
    }),
    resolveEffectivePlan(userId),
  ]);

  if (workspaceCount >= effective.limits.maxWorkspaces) {
    return {
      ok: false,
      error: ActionResponse.failure(
        ERROR_CODES.PLAN_LIMIT_EXCEEDED,
        effective.isDowngraded
          ? `You've reached the maximum of ${effective.limits.maxWorkspaces} workspace on the FREE plan after downgrade. Upgrade to PRO to create up to ${PLAN_LIMITS.PRO.maxWorkspaces}.`
          : effective.plan === "FREE"
            ? `You've reached the maximum of ${effective.limits.maxWorkspaces} workspace on the FREE plan. Upgrade to PRO to create up to ${PLAN_LIMITS.PRO.maxWorkspaces}.`
            : `You've reached the maximum of ${effective.limits.maxWorkspaces} workspaces on the ${effective.plan} plan.`,
      ),
    };
  }

  return { ok: true };
}

/**
 * Check whether a workspace can create another project.
 *
 * The project count belongs to the workspace, but the plan
 * belongs to the workspace OWNER.
 *
 * Called at the top of `createProject`.
 */
export async function assertCanCreateProject(
  workspaceId: string,
): Promise<LimitCheckResult> {
  const ownerId = await getWorkspaceOwnerId(workspaceId);

  if (!ownerId) {
    return {
      ok: false,
      error: ActionResponse.failure(
        ERROR_CODES.FORBIDDEN,
        "Workspace not found.",
      ),
    };
  }

  const [effective, projectCount] = await Promise.all([
    resolveEffectivePlan(ownerId),
    db.project.count({
      where: {
        workspaceId,
      },
    }),
  ]);

  if (projectCount >= effective.limits.maxProjectsPerWorkspace) {
    return {
      ok: false,
      error: ActionResponse.failure(
        ERROR_CODES.PLAN_LIMIT_EXCEEDED,
        effective.isDowngraded
          ? `You've reached the maximum of ${effective.limits.maxProjectsPerWorkspace} projects on the FREE plan after downgrade. Upgrade to restore access.`
          : `You've reached the maximum of ${effective.limits.maxProjectsPerWorkspace} projects on the ${effective.plan} plan. Upgrade to create more.`,
      ),
    };
  }

  return { ok: true };
}

/**
 * Check if a workspace is read-only.
 *
 * Since subscriptions belong to users, this resolves the
 * workspace owner and checks the owner's subscription.
 *
 * Returns a ready-to-return error if read-only,
 * or null if the workspace is writable.
 */
export async function assertWorkspaceWritable(
  workspaceId: string,
): Promise<ActionError | null> {
  const ownerId = await getWorkspaceOwnerId(workspaceId);

  if (!ownerId) {
    return ActionResponse.failure(
      ERROR_CODES.FORBIDDEN,
      "Workspace not found.",
    );
  }

  const effective = await resolveEffectivePlan(ownerId);

  if (!effective.isDowngraded) {
    return null;
  }

  return ActionResponse.failure(
    ERROR_CODES.FORBIDDEN,
    `This workspace is in read-only mode because the subscription has been downgraded. Upgrade to restore full access.`,
  );
}
