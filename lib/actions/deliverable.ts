"use server";

import type {
  Deliverable,
  DeliverableVersion,
} from "@/app/generated/prisma/client";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { actorOf, recordActivity } from "@/lib/actions/activity";
import { can, defineAction, writable } from "@/lib/actions/define";
import { resolveProjectAccess } from "@/lib/access";
import { ERROR_CODES } from "@/lib/constants/errors";
import { assertWorkspaceWritable } from "@/lib/services/plan-limits";
import { claimFileForVersion } from "@/lib/files/claim-file";
import type { ActionResponseType } from "@/lib/types/action";
import { ActionResponse } from "@/lib/utils/action-response";
import {
  createDeliverableSchema,
  createDeliverableVersionSchema,
  deliverableIdSchema,
  projectDeliverablesSchema,
  updateDeliverableSchema,
} from "@/lib/validation/deliverable";

// ──────────────────────────────────────────────
// Result types
// ──────────────────────────────────────────────

export type DeliverableResult = Deliverable;
export type DeliverableListResult = { items: Deliverable[] };
export type DeliverableVersionResult = DeliverableVersion;
export type DeleteResult = { deleted: boolean };

const deliverableConflict = () =>
  ActionResponse.failure(
    ERROR_CODES.CONFLICT,
    "This deliverable was modified by someone else. Refresh to see the latest version and try again.",
  );

// dashboard paths handled via shared helper

// ──────────────────────────────────────────────
// Server Actions
// ──────────────────────────────────────────────

export const listDeliverables = defineAction({
  schema: projectDeliverablesSchema,
  guard: (input) => resolveProjectAccess(input.projectId),
  errors: { fallback: "Failed to load deliverables." },
  run: async (input): Promise<ActionResponseType<DeliverableListResult>> => {
    const items = await db.deliverable.findMany({
      where: { projectId: input.projectId },
      orderBy: { createdAt: "desc" },
    });
    return ActionResponse.success({ items }, "Deliverables loaded");
  },
});

export const getDeliverable = defineAction({
  schema: deliverableIdSchema,
  guard: null,
  errors: { fallback: "Failed to load the deliverable." },
  run: async (input): Promise<ActionResponseType<DeliverableResult>> => {
    const deliverable = await db.deliverable.findUnique({
      where: { id: input.id },
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
  },
});

export const createDeliverable = defineAction({
  schema: createDeliverableSchema,
  guard: (input) => resolveProjectAccess(input.projectId),
  check: [
    can("canManageDeliverables", "You have view-only access to this project."),
    writable,
  ],
  revalidate: true,
  errors: { fallback: "Failed to create the deliverable." },
  run: async (input, ctx): Promise<ActionResponseType<DeliverableResult>> => {
    const deliverable = await db.deliverable.create({
      data: {
        projectId: input.projectId,
        title: input.title,
        description: input.description ?? null,
      },
    });

    await recordActivity({
      projectId: input.projectId,
      type: "DELIVERABLE_CREATED",
      ...actorOf(ctx.user),
      meta: { title: deliverable.title },
    });

    return ActionResponse.success(
      deliverable,
      "Deliverable created successfully",
    );
  },
});

export const updateDeliverable = defineAction({
  schema: updateDeliverableSchema,
  guard: null,
  revalidate: true,
  errors: {
    fallback: "Failed to update the deliverable.",
  },
  run: async (input): Promise<ActionResponseType<DeliverableResult>> => {
    const { id, expectedVersion, title, description, status } = input;

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

    const readOnlyError = await assertWorkspaceWritable(
      access.value.workspaceId,
    );
    if (readOnlyError) return readOnlyError;

    // ── Quality gate ──
    // Contributors work on drafts; once a deliverable is submitted it is
    // client-facing, so only a lead (or admin/owner) can touch it or push
    // it back into review. Approvals/change-requests belong to the client.
    const touchesContent = title !== undefined || description !== undefined;
    if (existing.status === "APPROVED") {
      return ActionResponse.failure(
        ERROR_CODES.INVALID_STATUS,
        "Approved deliverables are final and cannot be edited.",
      );
    }

    const statusChanged = status !== undefined && status !== existing.status;
    const validStatusTransition =
      (existing.status === "DRAFT" && status === "IN_REVIEW") ||
      (existing.status === "IN_REVIEW" && status === "DRAFT") ||
      (existing.status === "CHANGES_REQUESTED" && status === "IN_REVIEW");
    if (statusChanged && !validStatusTransition) {
      return ActionResponse.failure(
        ERROR_CODES.INVALID_STATUS,
        "This deliverable cannot make that review transition.",
      );
    }

    if (!touchesContent && !statusChanged) {
      return ActionResponse.failure(
        ERROR_CODES.VALIDATION_ERROR,
        "Provide a change to save.",
      );
    }

    const requiresLead =
      existing.status !== "DRAFT" ||
      status === "IN_REVIEW";
    if (requiresLead) {
      if (!access.value.canSubmitForReview) {
        return ActionResponse.failure(
          ERROR_CODES.FORBIDDEN,
          "Only a project lead can modify or submit deliverables under review.",
        );
      }
    }
    // Optimistic locking: if the caller sends the version it loaded,
    // reject stale writes instead of silently overwriting concurrent
    // changes (e.g. the client approving/rejecting this deliverable).
    if (existing.version !== expectedVersion) return deliverableConflict();

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

    const deliverable = await db.$transaction(async (tx) => {
      const claimed = await tx.deliverable.updateMany({
        where: { id, version: expectedVersion, status: existing.status },
        data,
      });
      if (claimed.count !== 1) return null;
      return tx.deliverable.findUniqueOrThrow({ where: { id } });
    });
    if (!deliverable) return deliverableConflict();

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
          ...actorOf(access.value.user),
          meta: { from: existing.status, to: deliverable.status },
        });
      }
    }

    revalidatePath(`/portal/projects/${deliverable.projectId}`, "page");
    return ActionResponse.success(
      deliverable,
      "Deliverable updated successfully",
    );
  },
});

export const deleteDeliverable = defineAction({
  schema: deliverableIdSchema,
  guard: null,
  revalidate: true,
  errors: { fallback: "Failed to delete the deliverable." },
  run: async (input): Promise<ActionResponseType<DeleteResult>> => {
    const deliverable = await db.deliverable.findUnique({
      where: { id: input.id },
      select: { id: true, projectId: true, status: true },
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

    if (deliverable.status !== "DRAFT") {
      return ActionResponse.failure(
        ERROR_CODES.INVALID_STATUS,
        "Submitted deliverables and their review history cannot be deleted.",
      );
    }

    const readOnlyError = await assertWorkspaceWritable(
      access.value.workspaceId,
    );
    if (readOnlyError) return readOnlyError;

    await db.deliverable.delete({ where: { id: input.id } });
    return ActionResponse.success(
      { deleted: true },
      "Deliverable deleted successfully",
    );
  },
});

export const addDeliverableVersion = defineAction({
  schema: createDeliverableVersionSchema,
  guard: null,
  revalidate: true,
  errors: {
    fallback: "Failed to add the deliverable version.",
    conflict:
      "This version conflicts with a newer change. Refresh and try again.",
  },
  run: async (input): Promise<ActionResponseType<DeliverableVersionResult>> => {
    const deliverable = await db.deliverable.findUnique({
      where: { id: input.deliverableId },
      select: { id: true, projectId: true, status: true, version: true },
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
    if (deliverable.status !== "DRAFT" && !access.value.canSubmitForReview) {
      return ActionResponse.failure(
        ERROR_CODES.FORBIDDEN,
        "Only a project lead can add versions once a deliverable is submitted.",
      );
    }
    if (deliverable.status === "APPROVED") {
      return ActionResponse.failure(
        ERROR_CODES.INVALID_STATUS,
        "Approved deliverables are final and cannot receive new versions.",
      );
    }
    const readOnlyError = await assertWorkspaceWritable(
      access.value.workspaceId,
    );
    if (readOnlyError) return readOnlyError;

    const version = await db.$transaction(async (tx) => {
      // Claim the shared review token first. Concurrent uploads from the same
      // view cannot allocate the same next version or attach to stale review.
      const claimed = await tx.deliverable.updateMany({
        where: {
          id: deliverable.id,
          version: input.expectedVersion,
          status: deliverable.status,
        },
        data: { version: { increment: 1 } },
      });
      if (claimed.count !== 1) return null;

      if (input.fileId) {
        await claimFileForVersion(tx, {
          fileId: input.fileId,
          projectId: deliverable.projectId,
          userId: access.value.user.id,
        });
      }

      const lastVersion = await tx.deliverableVersion.findFirst({
        where: { deliverableId: deliverable.id },
        orderBy: { versionNumber: "desc" },
        select: { versionNumber: true },
      });
      const versionNumber =
        input.versionNumber ??
        (lastVersion ? lastVersion.versionNumber + 1 : 1);

      return tx.deliverableVersion.create({
        data: {
          deliverableId: deliverable.id,
          versionNumber,
          fileId: input.fileId ?? null,
          notes: input.notes ?? null,
        },
      });
    });
    if (!version) return deliverableConflict();

    await recordActivity({
      projectId: deliverable.projectId,
      type: "DELIVERABLE_VERSION_UPLOADED",
      ...actorOf(access.value.user),
      meta: { versionNumber: version.versionNumber },
    });

    return ActionResponse.success(
      version,
      "Deliverable version uploaded successfully",
    );
  },
});
