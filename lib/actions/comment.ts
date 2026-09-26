"use server";

import type { Comment } from "@/app/generated/prisma/client";
import { db } from "@/lib/prisma";
import { actorOf, recordActivity } from "@/lib/actions/activity";
import { defineAction } from "@/lib/actions/define";
import { resolveProjectAccess } from "@/lib/access";
import { ERROR_CODES } from "@/lib/constants/errors";
import { assertWorkspaceWritable } from "@/lib/services/plan-limits";
import type { ActionResponseType } from "@/lib/types/action";
import { ActionResponse } from "@/lib/utils/action-response";
import { addCommentSchema } from "@/lib/validation/comment";

// ──────────────────────────────────────────────
// Result types
// ──────────────────────────────────────────────

export type CommentResult = Comment;

// ──────────────────────────────────────────────
// Server Actions
// ──────────────────────────────────────────────

/**
 * Freelancer adds a comment to a deliverable or request.
 * Uses authorUserId (not authorEmail like the client portal).
 */
export const addComment = defineAction({
  schema: addCommentSchema,
  guard: null,
  revalidate: true,
  errors: { fallback: "Failed to add comment." },
  run: async (input): Promise<ActionResponseType<CommentResult>> => {
    const { targetType, targetId, content } = input;

    // Verify the target exists and get project ID
    let projectId: string;

    if (targetType === "deliverable") {
      const deliverable = await db.deliverable.findUnique({
        where: { id: targetId },
        select: { id: true, projectId: true },
      });
      if (!deliverable) {
        return ActionResponse.failure(
          ERROR_CODES.NOT_FOUND,
          "Deliverable not found.",
        );
      }
      projectId = deliverable.projectId;
    } else {
      const request = await db.request.findUnique({
        where: { id: targetId },
        select: { id: true, projectId: true },
      });
      if (!request) {
        return ActionResponse.failure(
          ERROR_CODES.NOT_FOUND,
          "Request not found.",
        );
      }
      projectId = request.projectId;
    }

    // RBAC check
    const access = await resolveProjectAccess(projectId);
    if (!access.ok) return access.error;

    const readOnlyError = await assertWorkspaceWritable(access.value.workspaceId);
    if (readOnlyError) return readOnlyError;

    // Create the comment
    const comment = await db.comment.create({
      data: {
        content,
        authorUserId: access.value.user.id,
        authorEmail: access.value.user.email,
        authorName: access.value.user.name,
        ...(targetType === "deliverable"
          ? { deliverableId: targetId }
          : { requestId: targetId }),
      },
    });

    // Record activity
    await recordActivity({
      projectId,
      type: "COMMENT_ADDED",
      ...actorOf(access.value.user),
      meta: { targetType, targetId, preview: content.slice(0, 100) },
    });

    return ActionResponse.success(comment, "Comment added");
  },
});
