"use server";

import type { Request as RequestModel } from "@/app/generated/prisma/client";
import { db } from "@/lib/prisma";
import { actorOf, recordActivity } from "@/lib/actions/activity";
import { defineAction } from "@/lib/actions/define";
import { resolveProjectAccess } from "@/lib/access";
import { ERROR_CODES } from "@/lib/constants/errors";
import { assertWorkspaceWritable } from "@/lib/services/plan-limits";
import type { ActionResponseType } from "@/lib/types/action";
import { ActionResponse } from "@/lib/utils/action-response";
import { updateRequestStatusSchema } from "@/lib/validation/request";

// ──────────────────────────────────────────────
// Result types
// ──────────────────────────────────────────────

export type RequestResult = RequestModel;

// ──────────────────────────────────────────────
// Server Actions
// ──────────────────────────────────────────────

export const updateRequestStatus = defineAction({
  schema: updateRequestStatusSchema,
  guard: null,
  revalidate: true,
  errors: { fallback: "Failed to update the request status." },
  run: async (input): Promise<ActionResponseType<RequestResult>> => {
    const existing = await db.request.findUnique({
      where: { id: input.id },
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

    const request = await db.$transaction(async (tx) => {
      const current = await tx.request.findUnique({ where: { id: input.id } });
      if (!current) return null;
      const updated = await tx.request.update({
        where: { id: input.id },
        data: { status: input.status },
      });
      await recordActivity({
        projectId: updated.projectId,
        type: "REQUEST_STATUS_CHANGED",
        ...actorOf(access.value.user),
        meta: { from: current.status, to: updated.status },
      }, tx);
      return updated;
    });
    if (!request) return ActionResponse.failure(ERROR_CODES.NOT_FOUND, "Request not found.");

    return ActionResponse.success(
      request,
      "Request status updated successfully",
    );
  },
});
