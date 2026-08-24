/**
 * Plan-limits service — single source of truth for:
 *   2.1  Limit-checking (assertCanCreateWorkspace / assertCanCreateProject)
 *   2.2  Downgrade handling (read-only lock after grace period)
 *
 * All functions return a discriminated union so callers can short-circuit
 * without try/catch. No magic numbers — limits come from lib/constants/plans.ts.
 */

import { db } from "@/lib/prisma";
import { ERROR_CODES } from "@/lib/constants/errors";
import {
  PLAN_LIMITS,
  getPlanKey,
} from "@/lib/constants/plans";
import type { PlanKey } from "@/lib/constants/plans";
import type { ActionError } from "@/lib/types/action";
import { ActionResponse } from "@/lib/utils/action-response";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type LimitCheckResult =
  | { ok: true }
  | { ok: false; error: ActionError };

/**
 * The plan a workspace is *effectively* on right now.
 * After a cancellation grace period expires, the effective plan
 * drops to FREE regardless of what the subscription row says.
 */
export type EffectivePlan = {
  /** The stored subscription plan (e.g. "PRO"). */
  plan: PlanKey;
  /** Whether the grace period has expired and limits have dropped. */
  isDowngraded: boolean;
  /** When the grace period ends (null if not in grace). */
  gracePeriodEndsAt: Date | null;
  /** The limits that currently apply. */
  limits: (typeof PLAN_LIMITS)[PlanKey];
};

// ──────────────────────────────────────────────
// Internal helpers
// ──────────────────────────────────────────────

/**
 * Resolves the effective plan from a subscription row (or its absence).
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
): { plan: PlanKey; isDowngraded: boolean; gracePeriodEndsAt: Date | null } {
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
 * Resolves the effective plan for a workspace.
 * Checks the subscription row AND the grace period.
 */
async function resolveEffectivePlan(
  workspaceId: string,
): Promise<EffectivePlan> {
  const subscription = await db.subscription.findUnique({
    where: { workspaceId },
    select: {
      plan: true,
      status: true,
      canceledAt: true,
      pausedAt: true,
      gracePeriodEndsAt: true,
    },
  });

  const resolved = resolvePlanFromSubscription(subscription);

  return {
    ...resolved,
    limits: PLAN_LIMITS[resolved.plan],
  };
}

// ──────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────

/**
 * Returns the effective plan for a workspace — accounts for cancellation
 * grace periods. Use this in UI to show warnings / banners.
 */
export async function getEffectivePlan(
  workspaceId: string,
): Promise<EffectivePlan> {
  return resolveEffectivePlan(workspaceId);
}

/**
 * Check whether a user can create another workspace.
 * Called at the top of `createWorkspace`.
 */
export async function assertCanCreateWorkspace(
  userId: string,
): Promise<LimitCheckResult> {
  const workspaceCount = await db.workspace.count({
    where: { ownerId: userId },
  });

  // To determine limits we need the user's plan.
  // Fetch the first workspace's subscription to get the plan.
  const firstWorkspace = await db.workspace.findFirst({
    where: { ownerId: userId },
    select: {
      subscription: {
        select: {
          plan: true,
          status: true,
          canceledAt: true,
          pausedAt: true,
          gracePeriodEndsAt: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const resolved = resolvePlanFromSubscription(firstWorkspace?.subscription);
  const limits = PLAN_LIMITS[resolved.plan];

  if (workspaceCount >= limits.maxWorkspaces) {
    return {
      ok: false,
      error: ActionResponse.failure(
        ERROR_CODES.PLAN_LIMIT_EXCEEDED,
        resolved.isDowngraded
          ? `You've reached the maximum of ${limits.maxWorkspaces} workspace on the FREE plan after downgrade. Upgrade to PRO to create up to ${PLAN_LIMITS.PRO.maxWorkspaces}.`
          : resolved.plan === "FREE"
            ? `You've reached the maximum of ${limits.maxWorkspaces} workspace on the FREE plan. Upgrade to PRO to create up to ${PLAN_LIMITS.PRO.maxWorkspaces}.`
            : `You've reached the maximum of ${limits.maxWorkspaces} workspaces on the ${resolved.plan} plan.`,
      ),
    };
  }

  return { ok: true };
}

/**
 * Check whether a workspace can create another project.
 * Called at the top of `createProject`.
 */
export async function assertCanCreateProject(
  workspaceId: string,
): Promise<LimitCheckResult> {
  const effective = await resolveEffectivePlan(workspaceId);

  const projectCount = await db.project.count({
    where: { workspaceId },
  });

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
 * Check if workspace is read-only. Returns a ready-to-return error
 * if read-only, or null if the workspace is writable.
 */
export async function assertWorkspaceWritable(
  workspaceId: string,
): Promise<ActionError | null> {
  const effective = await resolveEffectivePlan(workspaceId);
  if (!effective.isDowngraded) return null;

  return ActionResponse.failure(
    ERROR_CODES.FORBIDDEN,
    `This workspace is in read-only mode because the subscription has been downgraded. Upgrade to restore full access.`,
  );
}
