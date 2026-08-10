"use server";

import { revalidatePath } from "next/cache";
import type { Request as RequestModel } from "@/app/generated/prisma/client";
import { db } from "@/lib/prisma";
import { recordActivity } from "@/lib/actions/activity";
import { toActionError } from "@/lib/actions/helpers";
import {
  requireProjectInWorkspace,
  requireWorkspace,
} from "@/lib/actions/guards";
import { ERROR_CODES } from "@/lib/constants/errors";
import type { ActionResponseType } from "@/lib/types/action";
import { ActionResponse } from "@/lib/utils/action-response";
import {
  createRequestSchema,
  projectRequestsSchema,
  requestIdSchema,
  updateRequestSchema,
  updateRequestStatusSchema,
} from "@/lib/validation/request";
import type {
  CreateRequestInput,
  ProjectRequestsInput,
  RequestIdInput,
  UpdateRequestInput,
  UpdateRequestStatusInput,
} from "@/lib/validation/request";

// ──────────────────────────────────────────────
// Result types
// ──────────────────────────────────────────────

export type RequestResult = RequestModel;
export type RequestListResult = { items: RequestModel[] };
export type DeleteRequestResult = { deleted: boolean };

const arena = "/";

// ──────────────────────────────────────────────
// Server Actions
// ──────────────────────────────────────────────

export const listRequests = async (
  data: ProjectRequestsInput,
): Promise<ActionResponseType<RequestListResult>> => {
  const validated = projectRequestsSchema.safeParse(data);
  if (!validated.success) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid input",
      validated.error.flatten().fieldErrors,
    );
  }

  const guard = await requireWorkspace();
  if (!guard.ok) return guard.error;

  const projectInScope = await requireProjectInWorkspace(
    guard.value.workspace.id,
    validated.data.projectId,
  );
  if (!projectInScope.ok) return projectInScope.error;

  try {
    const items = await db.request.findMany({
      where: { projectId: validated.data.projectId },
      orderBy: { createdAt: "desc" },
    });
    return ActionResponse.success({ items }, "Requests loaded");
  } catch (error) {
    return toActionError(error, { fallback: "Failed to load requests." });
  }
};

export const getRequest = async (
  data: RequestIdInput,
): Promise<ActionResponseType<RequestResult>> => {
  const validated = requestIdSchema.safeParse(data);
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
        id: validated.data.id,
        project: { workspaceId: guard.value.workspace.id },
      },
    });
    if (!request) {
      return ActionResponse.failure(
        ERROR_CODES.NOT_FOUND,
        "Request not found.",
      );
    }
    return ActionResponse.success(request, "Request loaded");
  } catch (error) {
    return toActionError(error, { fallback: "Failed to load the request." });
  }
};

export const createRequest = async (
  data: CreateRequestInput,
): Promise<ActionResponseType<RequestResult>> => {
  const validated = createRequestSchema.safeParse(data);
  if (!validated.success) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid input",
      validated.error.flatten().fieldErrors,
    );
  }

  const guard = await requireWorkspace();
  if (!guard.ok) return guard.error;

  const projectInScope = await requireProjectInWorkspace(
    guard.value.workspace.id,
    validated.data.projectId,
  );
  if (!projectInScope.ok) return projectInScope.error;

  try {
    const request = await db.request.create({
      data: {
        projectId: validated.data.projectId,
        title: validated.data.title,
        description: validated.data.description ?? null,
      },
    });

    await recordActivity({
      projectId: validated.data.projectId,
      type: "REQUEST_CREATED",
      actorUserId: guard.value.user.id,
      actorEmail: guard.value.user.email,
      actorName: guard.value.user.name,
      meta: { title: request.title },
    });

    revalidatePath(arena);
    return ActionResponse.success(request, "Request created successfully");
  } catch (error) {
    return toActionError(error, { fallback: "Failed to create the request." });
  }
};

export const updateRequest = async (
  data: UpdateRequestInput,
): Promise<ActionResponseType<RequestResult>> => {
  const validated = updateRequestSchema.safeParse(data);
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
        id: validated.data.id,
        project: { workspaceId: guard.value.workspace.id },
      },
      select: { id: true },
    });
    if (!request) {
      return ActionResponse.failure(
        ERROR_CODES.NOT_FOUND,
        "Request not found.",
      );
    }

    const updated = await db.request.update({
      where: { id: validated.data.id },
      data: {
        title: validated.data.title,
        description: validated.data.description ?? null,
      },
    });

    revalidatePath(arena);
    return ActionResponse.success(updated, "Request updated successfully");
  } catch (error) {
    return toActionError(error, { fallback: "Failed to update the request." });
  }
};


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

  const guard = await requireWorkspace();
  if (!guard.ok) return guard.error;

  try {
    const existing = await db.request.findFirst({
      where: {
        id: validated.data.id,
        project: { workspaceId: guard.value.workspace.id },
      },
    });
    if (!existing) {
      return ActionResponse.failure(
        ERROR_CODES.NOT_FOUND,
        "Request not found.",
      );
    }

    const request = await db.request.update({
      where: { id: validated.data.id },
      data: { status: validated.data.status },
    });

    await recordActivity({
      projectId: request.projectId,
      type: "REQUEST_STATUS_CHANGED",
      actorUserId: guard.value.user.id,
      actorEmail: guard.value.user.email,
      actorName: guard.value.user.name,
      meta: { from: existing.status, to: request.status },
    });

    revalidatePath(arena);
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

export const deleteRequest = async (
  data: RequestIdInput,
): Promise<ActionResponseType<DeleteRequestResult>> => {
  const validated = requestIdSchema.safeParse(data);
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
        id: validated.data.id,
        project: { workspaceId: guard.value.workspace.id },
      },
      select: { id: true },
    });
    if (!request) {
      return ActionResponse.failure(
        ERROR_CODES.NOT_FOUND,
        "Request not found.",
      );
    }

    await db.request.delete({ where: { id: validated.data.id } });
    revalidatePath(arena);
    return ActionResponse.success(
      { deleted: true },
      "Request deleted successfully",
    );
  } catch (error) {
    return toActionError(error, { fallback: "Failed to delete the request." });
  }
};

