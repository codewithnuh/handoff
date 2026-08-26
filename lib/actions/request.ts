"use server";

import type { Request as RequestModel } from "@/app/generated/prisma/client";
import { db } from "@/lib/prisma";
import { recordActivity } from "@/lib/actions/activity";
import { revalidateDashboard } from "@/lib/actions/revalidate";
import { toActionError } from "@/lib/actions/helpers";
import { resolveProjectAccess } from "@/lib/actions/guards";
import { ERROR_CODES } from "@/lib/constants/errors";
import { assertWorkspaceWritable } from "@/lib/services/plan-limits";
import type { ActionResponseType } from "@/lib/types/action";
import { ActionResponse } from "@/lib/utils/action-response";
import { updateRequestStatusSchema } from "@/lib/validation/request";
import type { UpdateRequestStatusInput } from "@/lib/validation/request";

// ──────────────────────────────────────────────
// Result types
// ──────────────────────────────────────────────

export type RequestResult = RequestModel;

// ──────────────────────────────────────────────
// Server Actions
// ──────────────────────────────────────────────

export const updateRequestStatus = async (
  data: UpdateRequestStatusInput,
): Promise<ActionResponseType<RequestResult>> => {
  const validated = updateRequestStatusSchema.safeParse(data);
  if (!validated.success) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid input",
      validated.error.flatten().fieldErrors,
    );
  }

  try {
    const existing = await db.request.findUnique({
      where: { id: validated.data.id },
    });
    if (!existing) {
      return ActionResponse.failure(
        ERROR_CODES.NOT_FOUND,
        "Request not found.",
      );
    }

    const access = await resolveProjectAccess(existing.projectId);
    if (!access.ok) return access.error;
    if (!access.value.canUpdateRequests) {
      return ActionResponse.failure(
        ERROR_CODES.FORBIDDEN,
        "You don't have permission to update requests on this project.",
      );
    }

    const readOnlyError = await assertWorkspaceWritable(access.value.workspaceId);
    if (readOnlyError) return readOnlyError;

    const request = await db.request.update({
      where: { id: validated.data.id },
      data: { status: validated.data.status },
    });

    await recordActivity({
      projectId: request.projectId,
      type: "REQUEST_STATUS_CHANGED",
      actorUserId: access.value.user.id,
      actorEmail: access.value.user.email,
      actorName: access.value.user.name,
      meta: { from: existing.status, to: request.status },
    });

    revalidateDashboard();
    return ActionResponse.success(
      request,
      "Request status updated successfully",
    );
  } catch (error) {
    return toActionError(error, {
      fallback: "Failed to update the request status.",
    });
  }
};
