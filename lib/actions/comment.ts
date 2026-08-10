"use server";

import { revalidatePath } from "next/cache";
import type { Comment as CommentModel } from "@/app/generated/prisma/client";
import { db } from "@/lib/prisma";
import { recordActivity } from "@/lib/actions/activity";
import { toActionError } from "@/lib/actions/helpers";
import { requireWorkspace } from "@/lib/actions/guards";
import { ERROR_CODES } from "@/lib/constants/errors";
import type { ActionResponseType } from "@/lib/types/action";
import { ActionResponse } from "@/lib/utils/action-response";
import {
  commentIdSchema,
  createCommentOnDeliverableSchema,
  createCommentOnRequestSchema,
  deliverablesCommentsSchema,
  requestCommentsSchema,
} from "@/lib/validation/comment";
import type {
  CommentIdInput,
  CreateCommentOnDeliverableInput,
  CreateCommentOnRequestInput,
  DeliverableCommentsInput,
  RequestCommentsInput,
} from "@/lib/validation/comment";

// ──────────────────────────────────────────────
// Result types
// ──────────────────────────────────────────────

export type CommentResult = CommentModel;
export type CommentListResult = { items: CommentModel[] };
export type DeleteCommentResult = { deleted: boolean };

const arena = "/";

// ──────────────────────────────────────────────
// Server Actions
// ──────────────────────────────────────────────

export const listDeliverableComments = async (
  data: DeliverableCommentsInput,
): Promise<ActionResponseType<CommentListResult>> => {
  const validated = deliverablesCommentsSchema.safeParse(data);
  if (!validated.success) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid input",
      validated.error.flatten().fieldErrors,
    );
  }

  const guard = await requireWorkspace();
  if (!guard.ok) return guard.error;

  try {
    const items = await db.comment.findMany({
      where: {
        deliverableId: validated.data.deliverableId,
        deliverable: { project: { workspaceId: guard.value.workspace.id } },
      },
      orderBy: { createdAt: "asc" },
    });
    return ActionResponse.success({ items }, "Comments loaded");
  } catch (error) {
    return toActionError(error, { fallback: "Failed to load comments." });
  }
};

export const listRequestComments = async (
  data: RequestCommentsInput,
): Promise<ActionResponseType<CommentListResult>> => {
  const validated = requestCommentsSchema.safeParse(data);
  if (!validated.success) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid input",
      validated.error.flatten().fieldErrors,
    );
  }

  const guard = await requireWorkspace();
  if (!guard.ok) return guard.error;

  try {
    const items = await db.comment.findMany({
      where: {
        requestId: validated.data.requestId,
        request: { project: { workspaceId: guard.value.workspace.id } },
      },
      orderBy: { createdAt: "asc" },
    });
    return ActionResponse.success({ items }, "Comments loaded");
  } catch (error) {
    return toActionError(error, { fallback: "Failed to load comments." });
  }
};

export const createCommentOnDeliverable = async (
  data: CreateCommentOnDeliverableInput,
): Promise<ActionResponseType<CommentResult>> => {
  const validated = createCommentOnDeliverableSchema.safeParse(data);
  if (!validated.success) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid input",
      validated.error.flatten().fieldErrors,
    );
  }

  const guard = await requireWorkspace();
  if (!guard.ok) return guard.error;

  try {
    const deliverable = await db.deliverable.findFirst({
      where: {
        id: validated.data.deliverableId,
        project: { workspaceId: guard.value.workspace.id },
      },
      select: { id: true, projectId: true },
    });
    if (!deliverable) {
      return ActionResponse.failure(
        ERROR_CODES.NOT_FOUND,
        "Deliverable not found.",
      );
    }

    const comment = await db.comment.create({
      data: {
        content: validated.data.content,
        authorUserId: guard.value.user.id,
        authorName: guard.value.user.name,
        deliverableId: deliverable.id,
      },
    });

    await recordActivity({
      projectId: deliverable.projectId,
      type: "COMMENT_ADDED",
      actorUserId: guard.value.user.id,
      actorEmail: guard.value.user.email,
      actorName: guard.value.user.name,
      meta: { deliverableId: deliverable.id },
    });

    revalidatePath(arena);
    return ActionResponse.success(comment, "Comment added successfully");
  } catch (error) {
    return toActionError(error, { fallback: "Failed to add the comment." });
  }
};

export const createCommentOnRequest = async (
  data: CreateCommentOnRequestInput,
): Promise<ActionResponseType<CommentResult>> => {
  const validated = createCommentOnRequestSchema.safeParse(data);
  if (!validated.success) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid input",
      validated.error.flatten().fieldErrors,
    );
  }

  const guard = await requireWorkspace();
  if (!guard.ok) return guard.error;

  try {
    const request = await db.request.findFirst({
      where: {
        id: validated.data.requestId,
        project: { workspaceId: guard.value.workspace.id },
      },
      select: { id: true, projectId: true },
    });
    if (!request) {
      return ActionResponse.failure(
        ERROR_CODES.NOT_FOUND,
        "Request not found.",
      );
    }

    const comment = await db.comment.create({
      data: {
        content: validated.data.content,
        authorUserId: guard.value.user.id,
        authorName: guard.value.user.name,
        requestId: request.id,
      },
    });

    await recordActivity({
      projectId: request.projectId,
      type: "COMMENT_ADDED",
      actorUserId: guard.value.user.id,
      actorEmail: guard.value.user.email,
      actorName: guard.value.user.name,
      meta: { requestId: request.id },
    });

    revalidatePath(arena);
    return ActionResponse.success(comment, "Comment added successfully");
  } catch (error) {
    return toActionError(error, { fallback: "Failed to add the comment." });
  }
};


export const deleteComment = async (
  data: CommentIdInput,
): Promise<ActionResponseType<DeleteCommentResult>> => {
  const validated = commentIdSchema.safeParse(data);
  if (!validated.success) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid input",
      validated.error.flatten().fieldErrors,
    );
  }

  const guard = await requireWorkspace();
  if (!guard.ok) return guard.error;

  try {
    const result = await db.comment.deleteMany({
      where: {
        id: validated.data.id,
        // Freelancers can only delete their own comments.
        authorUserId: guard.value.user.id,
        OR: [
          {
            deliverable: {
              project: { workspaceId: guard.value.workspace.id },
            },
          },
          {
            request: {
              project: { workspaceId: guard.value.workspace.id },
            },
          },
        ],
      },
    });
    if (result.count === 0) {
      return ActionResponse.failure(
        ERROR_CODES.NOT_FOUND,
        "Comment not found.",
      );
    }
    revalidatePath(arena);
    return ActionResponse.success(
      { deleted: true },
      "Comment deleted successfully",
    );
  } catch (error) {
    return toActionError(error, { fallback: "Failed to delete the comment." });
  }
};

