"use server";

import type {
  Deliverable,
  DeliverableVersion,
} from "@/app/generated/prisma/client";
import { db } from "@/lib/prisma";
import { recordActivity } from "@/lib/actions/activity";
import { revalidateDashboard } from "@/lib/actions/revalidate";
import { toActionError } from "@/lib/actions/helpers";
import { resolveProjectAccess } from "@/lib/actions/guards";
import { ERROR_CODES } from "@/lib/constants/errors";
import { assertWorkspaceWritable } from "@/lib/services/plan-limits";
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

// dashboard paths handled via shared helper

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

  const access = await resolveProjectAccess(validated.data.projectId);
  if (!access.ok) return access.error;

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

  try {
    const deliverable = await db.deliverable.findUnique({
      where: { id: validated.data.id },
    });
    if (!deliverable) {
      return ActionResponse.failure(
        ERROR_CODES.NOT_FOUND,
        "Deliverable not found.",
      );
    }

    // RBAC + need-to-know scoping
    const access = await resolveProjectAccess(deliverable.projectId);
    if (!access.ok) return access.error;

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

  const access = await resolveProjectAccess(validated.data.projectId);
  if (!access.ok) return access.error;

  if (!access.value.canManageDeliverables) {
    return ActionResponse.failure(
      ERROR_CODES.FORBIDDEN,
      "You have view-only access to this project.",
    );
  }

  const readOnlyError = await assertWorkspaceWritable(access.value.workspaceId);
  if (readOnlyError) return readOnlyError;

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
      actorUserId: access.value.user.id,
      actorEmail: access.value.user.email,
      actorName: access.value.user.name,
      meta: { title: deliverable.title },
    });

    revalidateDashboard();
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

  const { id, expectedVersion, title, description, status } = validated.data;

  try {
    const existing = await db.deliverable.findUnique({ where: { id } });
    if (!existing) {
      return ActionResponse.failure(
        ERROR_CODES.NOT_FOUND,
        "Deliverable not found.",
      );
    }

    // RBAC + need-to-know scoping (also verifies workspace membership)
    const access = await resolveProjectAccess(existing.projectId);
    if (!access.ok) return access.error;

    if (access.value.isObserver || !access.value.canManageDeliverables) {
      return ActionResponse.failure(
        ERROR_CODES.FORBIDDEN,
        "You have view-only access to this project.",
      );
    }

    const readOnlyError = await assertWorkspaceWritable(access.value.workspaceId);
    if (readOnlyError) return readOnlyError;

    // ── Quality gate ──
    // Contributors work on drafts; once a deliverable is submitted it is
    // client-facing, so only a lead (or admin/owner) can touch it or push
    // it back into review. Approvals/change-requests belong to the client.
    const touchesContent =
      title !== undefined || description !== undefined;
    if (
      (touchesContent && existing.status !== "DRAFT") ||
      (status === "IN_REVIEW" && existing.status !== "IN_REVIEW")
    ) {
      if (!access.value.canSubmitForReview) {
        return ActionResponse.failure(
          ERROR_CODES.FORBIDDEN,
          "Only a project lead can modify or submit deliverables under review.",
        );
      }
    }
    if (
      status !== undefined &&
      status !== existing.status &&
      status !== "DRAFT" &&
      status !== "IN_REVIEW"
    ) {
      return ActionResponse.failure(
        ERROR_CODES.FORBIDDEN,
        "Approvals and change requests are made by the client in the portal.",
      );
    }

    // Optimistic locking: if the caller sends the version it loaded,
    // reject stale writes instead of silently overwriting concurrent
    // changes (e.g. the client approving/rejecting this deliverable).
    if (expectedVersion !== undefined && existing.version !== expectedVersion) {
      return ActionResponse.failure(
        ERROR_CODES.CONFLICT,
        "This deliverable was modified by someone else. Refresh and try again.",
      );
    }

    // Partial-update semantics: only touch the fields the caller sent.
    // (Blanket `?? null` mapping used to wipe description on status-only updates.)
    const data: {
      title?: string;
      description?: string | null;
      status?: (typeof existing)["status"];
      version: { increment: number };
    } = {
      // Every freelancer mutation bumps the lock version so portal
      // clients are prompted to refresh before acting on stale content.
      version: { increment: 1 },
    };
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (status !== undefined) data.status = status;

    const deliverable = await db.deliverable.update({
      // Atomic guard — rejects with P2025 if the row changed since the read
      where:
        expectedVersion !== undefined
          ? { id, version: expectedVersion }
          : { id },
      data,
    });

    const statusChanged = data.status !== undefined && data.status !== existing.status;

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
          actorUserId: access.value.user.id,
          actorEmail: access.value.user.email,
          actorName: access.value.user.name,
          meta: { from: existing.status, to: deliverable.status },
        });
      }
    }

    revalidateDashboard();
    return ActionResponse.success(
      deliverable,
      "Deliverable updated successfully",
    );
  } catch (error) {
    return toActionError(error, {
      fallback: "Failed to update the deliverable.",
      notFound: "This deliverable was just modified by someone else. Refresh and try again.",
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

  try {
    const deliverable = await db.deliverable.findUnique({
      where: { id: validated.data.id },
      select: { id: true, projectId: true },
    });
    if (!deliverable) {
      return ActionResponse.failure(
        ERROR_CODES.NOT_FOUND,
        "Deliverable not found.",
      );
    }

    // Deleting is a lead-level action (destructive + client-visible surface)
    const access = await resolveProjectAccess(deliverable.projectId);
    if (!access.ok) return access.error;
    if (!access.value.canSubmitForReview) {
      return ActionResponse.failure(
        ERROR_CODES.FORBIDDEN,
        "Only a project lead can delete deliverables.",
      );
    }

    const readOnlyError = await assertWorkspaceWritable(access.value.workspaceId);
    if (readOnlyError) return readOnlyError;

    await db.deliverable.delete({ where: { id: validated.data.id } });
    revalidateDashboard();
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

  try {
    const deliverable = await db.deliverable.findUnique({
      where: { id: validated.data.deliverableId },
      select: { id: true, projectId: true, status: true },
    });
    if (!deliverable) {
      return ActionResponse.failure(
        ERROR_CODES.NOT_FOUND,
        "Deliverable not found.",
      );
    }

    const access = await resolveProjectAccess(deliverable.projectId);
    if (!access.ok) return access.error;
    if (access.value.isObserver || !access.value.canManageDeliverables) {
      return ActionResponse.failure(
        ERROR_CODES.FORBIDDEN,
        "You have view-only access to this project.",
      );
    }
    // Contributors may upload versions to drafts; submitted work is
    // client-facing and lead-only.
    if (
      deliverable.status !== "DRAFT" &&
      !access.value.canSubmitForReview
    ) {
      return ActionResponse.failure(
        ERROR_CODES.FORBIDDEN,
        "Only a project lead can add versions once a deliverable is submitted.",
      );
    }

    const readOnlyError = await assertWorkspaceWritable(access.value.workspaceId);
    if (readOnlyError) return readOnlyError;

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
      actorUserId: access.value.user.id,
      actorEmail: access.value.user.email,
      actorName: access.value.user.name,
      meta: { versionNumber },
    });

    revalidateDashboard();
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

