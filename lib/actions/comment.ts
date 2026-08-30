"use server";

import type { Comment } from "@/app/generated/prisma/client";
import { db } from "@/lib/prisma";
import { recordActivity } from "@/lib/actions/activity";
import { revalidateDashboard } from "@/lib/actions/revalidate";
import { toActionError } from "@/lib/actions/helpers";
import { resolveProjectAccess } from "@/lib/actions/guards";
import { ERROR_CODES } from "@/lib/constants/errors";
import { assertWorkspaceWritable } from "@/lib/services/plan-limits";
import type { ActionResponseType } from "@/lib/types/action";
import { ActionResponse } from "@/lib/utils/action-response";
import { z } from "zod";

// ──────────────────────────────────────────────
// Validation
// ──────────────────────────────────────────────

const addCommentSchema = z.object({
  targetType: z.enum(["deliverable", "request"]),
  targetId: z.string().min(1),
  content: z
    .string()
    .trim()
    .min(1, "Comment cannot be empty")
    .max(5000, "Comment must be at most 5000 characters"),
});

type AddCommentInput = z.infer<typeof addCommentSchema>;

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
export const addComment = async (
  data: AddCommentInput,
): Promise<ActionResponseType<CommentResult>> => {
  const validated = addCommentSchema.safeParse(data);
  if (!validated.success) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid input",
      validated.error.flatten().fieldErrors,
    );
  }

  const { targetType, targetId, content } = validated.data;

  try {
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
      actorUserId: access.value.user.id,
      actorEmail: access.value.user.email,
      actorName: access.value.user.name,
      meta: { targetType, targetId, preview: content.slice(0, 100) },
    });

    revalidateDashboard();
    return ActionResponse.success(comment, "Comment added");
  } catch (error) {
    return toActionError(error, { fallback: "Failed to add comment." });
  }
};
