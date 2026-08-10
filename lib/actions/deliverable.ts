"use server";

import { revalidatePath } from "next/cache";
import type {
  Deliverable,
  DeliverableVersion,
} from "@/app/generated/prisma/client";
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
  createDeliverableSchema,
  createDeliverableVersionSchema,
  deliverableIdSchema,
  projectDeliverablesSchema,
  updateDeliverableSchema,
} from "@/lib/validation/deliverable";
import type {
  CreateDeliverableInput,
  CreateDeliverableVersionInput,
  DeliverableIdInput,
  ProjectDeliverablesInput,
  UpdateDeliverableInput,
} from "@/lib/validation/deliverable";

// ──────────────────────────────────────────────
// Result types
// ──────────────────────────────────────────────

export type DeliverableResult = Deliverable;
export type DeliverableListResult = { items: Deliverable[] };
export type DeliverableVersionResult = DeliverableVersion;
export type DeleteResult = { deleted: boolean };

const arena = "/";

// ──────────────────────────────────────────────
// Server Actions
// ──────────────────────────────────────────────

export const listDeliverables = async (
  data: ProjectDeliverablesInput,
): Promise<ActionResponseType<DeliverableListResult>> => {
  const validated = projectDeliverablesSchema.safeParse(data);
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
    const items = await db.deliverable.findMany({
      where: { projectId: validated.data.projectId },
      orderBy: { createdAt: "desc" },
    });
    return ActionResponse.success({ items }, "Deliverables loaded");
  } catch (error) {
    return toActionError(error, {
      fallback: "Failed to load deliverables.",
    });
  }
};

export const getDeliverable = async (
  data: DeliverableIdInput,
): Promise<ActionResponseType<DeliverableResult>> => {
  const validated = deliverableIdSchema.safeParse(data);
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
        id: validated.data.id,
        project: { workspaceId: guard.value.workspace.id },
      },
    });
    if (!deliverable) {
      return ActionResponse.failure(
        ERROR_CODES.NOT_FOUND,
        "Deliverable not found.",
      );
    }
    return ActionResponse.success(deliverable, "Deliverable loaded");
  } catch (error) {
    return toActionError(error, {
      fallback: "Failed to load the deliverable.",
    });
  }
};

export const createDeliverable = async (
  data: CreateDeliverableInput,
): Promise<ActionResponseType<DeliverableResult>> => {
  const validated = createDeliverableSchema.safeParse(data);
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
    const deliverable = await db.deliverable.create({
      data: {
        projectId: validated.data.projectId,
        title: validated.data.title,
        description: validated.data.description ?? null,
      },
    });

    await recordActivity({
      projectId: validated.data.projectId,
      type: "DELIVERABLE_CREATED",
      actorUserId: guard.value.user.id,
      actorEmail: guard.value.user.email,
      actorName: guard.value.user.name,
      meta: { title: deliverable.title },
    });

    revalidatePath(arena);
    return ActionResponse.success(
      deliverable,
      "Deliverable created successfully",
    );
  } catch (error) {
    return toActionError(error, {
      fallback: "Failed to create the deliverable.",
    });
  }
};


export const updateDeliverable = async (
  data: UpdateDeliverableInput,
): Promise<ActionResponseType<DeliverableResult>> => {
  const validated = updateDeliverableSchema.safeParse(data);
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
    const existing = await db.deliverable.findFirst({
      where: {
        id: validated.data.id,
        project: { workspaceId: guard.value.workspace.id },
      },
    });
    if (!existing) {
      return ActionResponse.failure(
        ERROR_CODES.NOT_FOUND,
        "Deliverable not found.",
      );
    }

    const statusChanged =
      validated.data.status !== undefined &&
      validated.data.status !== existing.status;

    const deliverable = await db.deliverable.update({
      where: { id: validated.data.id },
      data: {
        title: validated.data.title,
        description: validated.data.description ?? null,
        status: validated.data.status,
      },
    });

    if (statusChanged) {
      const activityType = (() => {
        switch (deliverable.status) {
          case "APPROVED":
            return "DELIVERABLE_APPROVED" as const;
          case "CHANGES_REQUESTED":
            return "CHANGES_REQUESTED" as const;
          case "IN_REVIEW":
            return "DELIVERABLE_SUBMITTED" as const;
          default:
            return null;
        }
      })();

      if (activityType) {
        await recordActivity({
          projectId: deliverable.projectId,
          type: activityType,
          actorUserId: guard.value.user.id,
          actorEmail: guard.value.user.email,
          actorName: guard.value.user.name,
          meta: { from: existing.status, to: deliverable.status },
        });
      }
    }

    revalidatePath(arena);
    return ActionResponse.success(
      deliverable,
      "Deliverable updated successfully",
    );
  } catch (error) {
    return toActionError(error, {
      fallback: "Failed to update the deliverable.",
    });
  }
};


export const deleteDeliverable = async (
  data: DeliverableIdInput,
): Promise<ActionResponseType<DeleteResult>> => {
  const validated = deliverableIdSchema.safeParse(data);
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
        id: validated.data.id,
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

    await db.deliverable.delete({ where: { id: validated.data.id } });
    revalidatePath(arena);
    return ActionResponse.success(
      { deleted: true },
      "Deliverable deleted successfully",
    );
  } catch (error) {
    return toActionError(error, {
      fallback: "Failed to delete the deliverable.",
    });
  }
};

export const addDeliverableVersion = async (
  data: CreateDeliverableVersionInput,
): Promise<ActionResponseType<DeliverableVersionResult>> => {
  const validated = createDeliverableVersionSchema.safeParse(data);
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

    const lastVersion = await db.deliverableVersion.findFirst({
      where: { deliverableId: deliverable.id },
      orderBy: { versionNumber: "desc" },
      select: { versionNumber: true },
    });
    const versionNumber =
      validated.data.versionNumber ??
      (lastVersion ? lastVersion.versionNumber + 1 : 1);

    const version = await db.deliverableVersion.create({
      data: {
        deliverableId: deliverable.id,
        versionNumber,
        fileId: validated.data.fileId ?? null,
        notes: validated.data.notes ?? null,
      },
    });

    await recordActivity({
      projectId: deliverable.projectId,
      type: "DELIVERABLE_VERSION_UPLOADED",
      actorUserId: guard.value.user.id,
      actorEmail: guard.value.user.email,
      actorName: guard.value.user.name,
      meta: { versionNumber },
    });

    revalidatePath(arena);
    return ActionResponse.success(
      version,
      "Deliverable version uploaded successfully",
    );
  } catch (error) {
    return toActionError(error, {
      fallback: "Failed to add the deliverable version.",
      conflict: "A version with this number already exists.",
    });
  }
};

