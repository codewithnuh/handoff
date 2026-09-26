"use server";

/**
 * Server actions for the client portal.
 *
 * Scoped to the client's session — NOT the freelancer's workspace. The
 * session is the guard band; project access is checked per action because
 * the project is discovered from the target record.
 *
 * Business rules:
 *   - DRAFT deliverables are invisible to clients and cannot be acted on.
 *   - Approve / request-changes are only allowed on deliverables that are
 *     IN_REVIEW or CHANGES_REQUESTED (i.e. submitted for review).
 */

import { revalidatePath } from "next/cache";
import { Prisma } from "@/app/generated/prisma/client";
import { db } from "@/lib/prisma";
import {
  requirePortalProjectAccess,
  requirePortalSession,
} from "@/lib/access";
import type { PortalSession } from "@/lib/access";
import { recordActivity } from "@/lib/actions/activity";
import { defineAction } from "@/lib/actions/define";
import { ERROR_CODES } from "@/lib/constants/errors";
import type { ActionResponseType } from "@/lib/types/action";
import { ActionResponse } from "@/lib/utils/action-response";
import {
  clientAddCommentSchema,
  clientApproveDeliverableSchema,
  clientCreateRequestSchema,
  clientRequestChangesSchema,
} from "@/lib/validation/portal";

/** Client-visible deliverable states. DRAFT is freelancer-internal. */
const CLIENT_ACTIONABLE_STATUSES = new Set(["IN_REVIEW", "CHANGES_REQUESTED"]);

const conflict = () =>
  ActionResponse.failure(
    ERROR_CODES.CONFLICT,
    "This deliverable was modified by someone else. Please refresh to see the latest version.",
  );

const isVersionConflict = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === "P2025";

const revalidatePortal = (projectId: string) => {
  revalidatePath("/portal");
  revalidatePath(`/portal/projects/${projectId}`);
};

/**
 * Client approves a deliverable.
 * Uses optimistic locking: the UPDATE's where-clause carries `version`, so a
 * concurrent edit rejects the write and the client gets CONFLICT.
 */
export const clientApproveDeliverable = defineAction({
  schema: clientApproveDeliverableSchema,
  guard: requirePortalSession,
  run: async (
    input,
    ctx,
  ): Promise<ActionResponseType<{ newVersion: number }>> => {
    const deliverable = await db.deliverable.findUnique({
      where: { id: input.deliverableId },
      select: { id: true, projectId: true, status: true, version: true },
    });
    if (!deliverable) {
      return ActionResponse.failure(ERROR_CODES.NOT_FOUND, "Deliverable not found");
    }

    const access = await requirePortalProjectAccess(
      ctx.email,
      deliverable.projectId,
    );
    if (!access.ok) return access.error;

    if (!CLIENT_ACTIONABLE_STATUSES.has(deliverable.status)) {
      return ActionResponse.failure(
        ERROR_CODES.INVALID_STATUS,
        "This deliverable hasn't been submitted for review yet.",
      );
    }

    if (deliverable.version !== input.expectedVersion) return conflict();

    try {
      const updated = await db.deliverable.update({
        where: { id: input.deliverableId, version: input.expectedVersion },
        data: { status: "APPROVED", version: { increment: 1 } },
      });

      await recordActivity({
        projectId: deliverable.projectId,
        type: "DELIVERABLE_APPROVED",
        actorEmail: ctx.email,
        actorName: ctx.email,
        meta: { from: deliverable.status, to: "APPROVED" },
      });

      revalidatePortal(deliverable.projectId);

      return ActionResponse.success(
        { newVersion: updated.version },
        "Deliverable approved",
      );
    } catch (error) {
      if (isVersionConflict(error)) return conflict();
      throw error;
    }
  },
});

/**
 * Client requests changes on a deliverable.
 * Optional comment can be attached.
 */
export const clientRequestChanges = defineAction({
  schema: clientRequestChangesSchema,
  guard: requirePortalSession,
  run: async (
    input,
    ctx,
  ): Promise<ActionResponseType<{ newVersion: number }>> => {
    const deliverable = await db.deliverable.findUnique({
      where: { id: input.deliverableId },
      select: { id: true, projectId: true, status: true, version: true },
    });
    if (!deliverable) {
      return ActionResponse.failure(ERROR_CODES.NOT_FOUND, "Deliverable not found");
    }

    const access = await requirePortalProjectAccess(
      ctx.email,
      deliverable.projectId,
    );
    if (!access.ok) return access.error;

    if (!CLIENT_ACTIONABLE_STATUSES.has(deliverable.status)) {
      return ActionResponse.failure(
        ERROR_CODES.INVALID_STATUS,
        "This deliverable hasn't been submitted for review yet.",
      );
    }

    if (deliverable.version !== input.expectedVersion) return conflict();

    try {
      const updated = await db.$transaction(async (tx) => {
        const result = await tx.deliverable.update({
          where: { id: input.deliverableId, version: input.expectedVersion },
          data: { status: "CHANGES_REQUESTED", version: { increment: 1 } },
        });

        if (input.comment?.trim()) {
          await tx.comment.create({
            data: {
              deliverableId: input.deliverableId,
              authorEmail: ctx.email,
              authorName: ctx.email,
              content: input.comment.trim(),
            },
          });
        }

        return result;
      });

      await recordActivity({
        projectId: deliverable.projectId,
        type: "CHANGES_REQUESTED",
        actorEmail: ctx.email,
        actorName: ctx.email,
        meta: { from: deliverable.status, to: "CHANGES_REQUESTED" },
      });

      revalidatePortal(deliverable.projectId);

      return ActionResponse.success(
        { newVersion: updated.version },
        "Changes requested",
      );
    } catch (error) {
      if (isVersionConflict(error)) return conflict();
      throw error;
    }
  },
});

/**
 * Client adds a comment to a deliverable or request.
 */
export const clientAddComment = defineAction({
  schema: clientAddCommentSchema,
  guard: requirePortalSession,
  errors: { fallback: "Failed to add comment." },
  run: async (
    input,
    ctx,
  ): Promise<ActionResponseType<{ commentId: string; authorEmail: string }>> => {
    let projectId: string;

    if (input.targetType === "deliverable") {
      const deliverable = await db.deliverable.findUnique({
        where: { id: input.targetId },
        select: { id: true, projectId: true },
      });
      if (!deliverable) {
        return ActionResponse.failure(ERROR_CODES.NOT_FOUND, "Deliverable not found");
      }
      projectId = deliverable.projectId;
    } else {
      const request = await db.request.findUnique({
        where: { id: input.targetId },
        select: { id: true, projectId: true },
      });
      if (!request) {
        return ActionResponse.failure(ERROR_CODES.NOT_FOUND, "Request not found");
      }
      projectId = request.projectId;
    }

    const access = await requirePortalProjectAccess(ctx.email, projectId);
    if (!access.ok) return access.error;

    const comment = await db.comment.create({
      data: {
        content: input.content.trim(),
        authorEmail: ctx.email,
        authorName: ctx.email,
        ...(input.targetType === "deliverable"
          ? { deliverableId: input.targetId }
          : { requestId: input.targetId }),
      },
    });

    await recordActivity({
      projectId,
      type: "COMMENT_ADDED",
      actorEmail: ctx.email,
      actorName: ctx.email,
      meta: {
        targetType: input.targetType,
        targetId: input.targetId,
        preview: input.content.trim().slice(0, 100),
      },
    });

    revalidatePath(`/portal/projects/${projectId}`);

    return ActionResponse.success(
      { commentId: comment.id, authorEmail: ctx.email },
      "Comment added",
    );
  },
});

const hasProjectAccess = async (
  ctx: PortalSession,
  input: { projectId: string },
) => {
  const access = await requirePortalProjectAccess(ctx.email, input.projectId);
  return access.ok ? null : access.error;
};

/**
 * Client creates a new request on a project.
 */
export const clientCreateRequest = defineAction({
  schema: clientCreateRequestSchema,
  guard: requirePortalSession,
  check: hasProjectAccess,
  errors: { fallback: "Failed to submit request." },
  run: async (
    input,
    ctx,
  ): Promise<ActionResponseType<{ requestId: string }>> => {
    const request = await db.request.create({
      data: {
        projectId: input.projectId,
        title: input.title.trim(),
        description: input.description?.trim() || null,
      },
    });

    await recordActivity({
      projectId: input.projectId,
      type: "REQUEST_CREATED",
      actorEmail: ctx.email,
      actorName: ctx.email,
      meta: { title: request.title },
    });

    revalidatePath(`/portal/projects/${input.projectId}`);

    return ActionResponse.success({ requestId: request.id }, "Request submitted");
  },
});
