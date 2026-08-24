"use server";

/**
 * Server actions for the client portal.
 *
 * These are scoped to the client's session — NOT the freelancer's workspace.
 * Every action verifies:
 *   1. Valid client session (cookie → email)
 *   2. ProjectAccess for the specific project
 *   3. Optimistic locking on deliverable mutations (version check)
 *
 * Business rules:
 *   - DRAFT deliverables are invisible to clients and cannot be acted on.
 *   - Approve / request-changes are only allowed on deliverables that are
 *     IN_REVIEW or CHANGES_REQUESTED (i.e. submitted for review).
 */

import { revalidatePath } from "next/cache";
import { Prisma } from "@/app/generated/prisma/client";
import { db } from "@/lib/prisma";
import { recordActivity } from "@/lib/actions/activity";
import {
  getClientPortalSession,
  requireProjectAccess,
} from "@/lib/portal";

// ──────────────────────────────────────────────
// Result types
// ──────────────────────────────────────────────

export type PortalActionResult<T = void> =
  | { ok: true; data: T; message: string }
  | { ok: false; error: string; code: string };

// ──────────────────────────────────────────────
// Internal: resolve client session from cookie
// ──────────────────────────────────────────────

async function resolveClientSession(): Promise<
  { ok: true; email: string } | { ok: false; result: PortalActionResult<never> }
> {
  const session = await getClientPortalSession();
  if (!session) {
    return {
      ok: false,
      result: {
        ok: false,
        error: "Not authenticated",
        code: "UNAUTHORIZED",
      },
    };
  }
  return { ok: true, email: session.email };
}

/**
 * Client-visible deliverable states. DRAFT is freelancer-internal.
 */
const CLIENT_ACTIONABLE_STATUSES = new Set(["IN_REVIEW", "CHANGES_REQUESTED"]);

function conflict(message?: string): PortalActionResult<never> {
  return {
    ok: false,
    error:
      message ??
      "This deliverable was modified by someone else. Please refresh to see the latest version.",
    code: "CONFLICT",
  };
}

/** Maps a failed conditional update (P2025) to a CONFLICT response. */
function toConflictOrError(error: unknown): PortalActionResult<never> {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  ) {
    // The version guard in the UPDATE where-clause rejected the write —
    // someone else mutated the row between our read and our write.
    return conflict();
  }
  console.error("Portal action error:", error);
  return {
    ok: false,
    error: "Something went wrong. Please try again.",
    code: "INTERNAL_ERROR",
  };
}

// ──────────────────────────────────────────────
// Actions
// ──────────────────────────────────────────────

/**
 * Client approves a deliverable.
 * Uses optimistic locking: checks `version` before updating, both in a read
 * check and atomically inside the UPDATE where-clause. If the version has
 * changed since the client loaded the page, returns CONFLICT so the UI can
 * refresh.
 */
export async function clientApproveDeliverable(
  deliverableId: string,
  expectedVersion: number,
): Promise<PortalActionResult<{ newVersion: number }>> {
  const session = await resolveClientSession();
  if (!session.ok) return session.result;

  const deliverable = await db.deliverable.findUnique({
    where: { id: deliverableId },
    select: { id: true, projectId: true, status: true, version: true },
  });

  if (!deliverable) {
    return { ok: false, error: "Deliverable not found", code: "NOT_FOUND" };
  }

  const access = await requireProjectAccess(session.email, deliverable.projectId);
  if (!access.ok) {
    return { ok: false, error: "Access denied", code: "FORBIDDEN" };
  }

  // Business rule: only submitted work can be approved
  if (!CLIENT_ACTIONABLE_STATUSES.has(deliverable.status)) {
    return {
      ok: false,
      error: "This deliverable hasn't been submitted for review yet.",
      code: "INVALID_STATUS",
    };
  }

  // Optimistic lock check
  if (deliverable.version !== expectedVersion) {
    return conflict();
  }

  try {
    const updated = await db.deliverable.update({
      // Atomic guard: rejects the write if the version moved between
      // the read above and this statement (race-safe without table locks)
      where: { id: deliverableId, version: expectedVersion },
      data: { status: "APPROVED", version: { increment: 1 } },
    });

    await recordActivity({
      projectId: deliverable.projectId,
      type: "DELIVERABLE_APPROVED",
      actorEmail: session.email,
      actorName: session.email,
      meta: { from: deliverable.status, to: "APPROVED" },
    });

    revalidatePath("/portal");
    revalidatePath(`/portal/projects/${deliverable.projectId}`);

    return {
      ok: true,
      data: { newVersion: updated.version },
      message: "Deliverable approved",
    };
  } catch (error) {
    return toConflictOrError(error);
  }
}

/**
 * Client requests changes on a deliverable.
 * Optional comment can be attached.
 */
export async function clientRequestChanges(
  deliverableId: string,
  expectedVersion: number,
  comment?: string,
): Promise<PortalActionResult<{ newVersion: number }>> {
  const session = await resolveClientSession();
  if (!session.ok) return session.result;

  const deliverable = await db.deliverable.findUnique({
    where: { id: deliverableId },
    select: { id: true, projectId: true, status: true, version: true },
  });

  if (!deliverable) {
    return { ok: false, error: "Deliverable not found", code: "NOT_FOUND" };
  }

  const access = await requireProjectAccess(session.email, deliverable.projectId);
  if (!access.ok) {
    return { ok: false, error: "Access denied", code: "FORBIDDEN" };
  }

  // Business rule: only submitted work can be rejected
  if (!CLIENT_ACTIONABLE_STATUSES.has(deliverable.status)) {
    return {
      ok: false,
      error: "This deliverable hasn't been submitted for review yet.",
      code: "INVALID_STATUS",
    };
  }

  if (deliverable.version !== expectedVersion) {
    return conflict();
  }

  try {
    // Transaction keeps status change + attached comment atomic
    const updated = await db.$transaction(async (tx) => {
      const result = await tx.deliverable.update({
        where: { id: deliverableId, version: expectedVersion },
        data: { status: "CHANGES_REQUESTED", version: { increment: 1 } },
      });

      if (comment?.trim()) {
        await tx.comment.create({
          data: {
            deliverableId,
            authorEmail: session.email,
            authorName: session.email,
            content: comment.trim(),
          },
        });
      }

      return result;
    });

    await recordActivity({
      projectId: deliverable.projectId,
      type: "CHANGES_REQUESTED",
      actorEmail: session.email,
      actorName: session.email,
      meta: { from: deliverable.status, to: "CHANGES_REQUESTED" },
    });

    revalidatePath("/portal");
    revalidatePath(`/portal/projects/${deliverable.projectId}`);

    return {
      ok: true,
      data: { newVersion: updated.version },
      message: "Changes requested",
    };
  } catch (error) {
    return toConflictOrError(error);
  }
}

/**
 * Client adds a comment to a deliverable or request.
 */
export async function clientAddComment(
  targetType: "deliverable" | "request",
  targetId: string,
  content: string,
): Promise<PortalActionResult<{ commentId: string; authorEmail: string }>> {
  const session = await resolveClientSession();
  if (!session.ok) return session.result;

  if (!content.trim()) {
    return {
      ok: false,
      error: "Comment cannot be empty",
      code: "VALIDATION_ERROR",
    };
  }

  // Verify the target exists and client has access
  let projectId: string;

  if (targetType === "deliverable") {
    const deliverable = await db.deliverable.findUnique({
      where: { id: targetId },
      select: { id: true, projectId: true },
    });
    if (!deliverable) {
      return { ok: false, error: "Deliverable not found", code: "NOT_FOUND" };
    }
    projectId = deliverable.projectId;
  } else {
    const request = await db.request.findUnique({
      where: { id: targetId },
      select: { id: true, projectId: true },
    });
    if (!request) {
      return { ok: false, error: "Request not found", code: "NOT_FOUND" };
    }
    projectId = request.projectId;
  }

  const access = await requireProjectAccess(session.email, projectId);
  if (!access.ok) {
    return { ok: false, error: "Access denied", code: "FORBIDDEN" };
  }

  const comment = await db.comment.create({
    data: {
      content: content.trim(),
      authorEmail: session.email,
      authorName: session.email,
      ...(targetType === "deliverable"
        ? { deliverableId: targetId }
        : { requestId: targetId }),
    },
  });

  await recordActivity({
    projectId,
    type: "COMMENT_ADDED",
    actorEmail: session.email,
    actorName: session.email,
    meta: { targetType, targetId, preview: content.trim().slice(0, 100) },
  });

  revalidatePath(`/portal/projects/${projectId}`);

  return {
    ok: true,
    data: { commentId: comment.id, authorEmail: session.email },
    message: "Comment added",
  };
}

/**
 * Client creates a new request on a project.
 */
export async function clientCreateRequest(
  projectId: string,
  title: string,
  description?: string,
): Promise<PortalActionResult<{ requestId: string }>> {
  const session = await resolveClientSession();
  if (!session.ok) return session.result;

  if (!title.trim()) {
    return {
      ok: false,
      error: "Title is required",
      code: "VALIDATION_ERROR",
    };
  }

  const access = await requireProjectAccess(session.email, projectId);
  if (!access.ok) {
    return { ok: false, error: "Access denied", code: "FORBIDDEN" };
  }

  const request = await db.request.create({
    data: {
      projectId,
      title: title.trim(),
      description: description?.trim() || null,
    },
  });

  await recordActivity({
    projectId,
    type: "REQUEST_CREATED",
    actorEmail: session.email,
    actorName: session.email,
    meta: { title: request.title },
  });

  revalidatePath(`/portal/projects/${projectId}`);

  return {
    ok: true,
    data: { requestId: request.id },
    message: "Request submitted",
  };
}
