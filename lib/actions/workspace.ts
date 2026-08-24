"use server";

import type { Workspace } from "@/app/generated/prisma/client";
import { db } from "@/lib/prisma";
import { revalidateDashboard } from "@/lib/actions/revalidate";
import { toActionError } from "@/lib/actions/helpers";
import { requireAuth, requireWorkspace } from "@/lib/actions/guards";
import { ERROR_CODES } from "@/lib/constants/errors";
import { assertCanCreateWorkspace } from "@/lib/services/plan-limits";
import type { ActionResponseType } from "@/lib/types/action";
import { ActionResponse } from "@/lib/utils/action-response";
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  workspaceIdSchema,
} from "@/lib/validation/workspace";
import type {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  WorkspaceIdInput,
} from "@/lib/validation/workspace";

// ──────────────────────────────────────────────
// Result types
// ──────────────────────────────────────────────

export type WorkspaceResult = Workspace;
export type WorkspaceListItem = {
  id: string;
  name: string;
  isOwner: boolean;
  isActive: boolean;
};
export type WorkspaceListResult = { items: WorkspaceListItem[] };
export type DeleteWorkspaceResult = { deleted: boolean };
export type SwitchWorkspaceResult = { workspace: Workspace };

const revalidateAll = () => {
  revalidateDashboard();
};

// ──────────────────────────────────────────────
// Server Actions
// ──────────────────────────────────────────────

/**
 * Get the current user's active workspace (null when none exists yet).
 */
export const getCurrentWorkspace = async (): Promise<
  ActionResponseType<WorkspaceResult | null>
> => {
  const guard = await requireAuth();
  if (!guard.ok) return guard.error;

  try {
    const userId = guard.value.id;

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { activeWorkspaceId: true },
    });

    let workspace = null;

    if (user?.activeWorkspaceId) {
      workspace = await db.workspace.findFirst({
        where: { id: user.activeWorkspaceId, ownerId: userId },
        include: { subscription: true },
      });
    }

    // Fallback: if active workspace is missing or unowned, pick the first
    if (!workspace) {
      workspace = await db.workspace.findFirst({
        where: { ownerId: userId },
        orderBy: { createdAt: "asc" },
        include: { subscription: true },
      });

      if (workspace) {
        await db.user.update({
          where: { id: userId },
          data: { activeWorkspaceId: workspace.id },
        }).catch(() => {});
      }
    }

    return ActionResponse.success(
      workspace,
      workspace ? "Workspace loaded" : "No workspace found",
    );
  } catch (error) {
    return toActionError(error, {
      fallback: "Failed to load the workspace.",
    });
  }
};

/**
 * List all workspaces the current user owns, with active indicator.
 */
export const listWorkspaces = async (): Promise<
  ActionResponseType<WorkspaceListResult>
> => {
  const guard = await requireAuth();
  if (!guard.ok) return guard.error;

  try {
    const userId = guard.value.id;

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { activeWorkspaceId: true },
    });

    const workspaces = await db.workspace.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    });

    const items: WorkspaceListItem[] = workspaces.map((ws) => ({
      id: ws.id,
      name: ws.name,
      isOwner: true, // all listed workspaces are owned by this user
      isActive: ws.id === user?.activeWorkspaceId,
    }));

    return ActionResponse.success({ items }, "Workspaces loaded");
  } catch (error) {
    return toActionError(error, {
      fallback: "Failed to load workspaces.",
    });
  }
};

/**
 * Create a new workspace for the current user.
 * Enforces plan-based workspace count limits.
 */
export const createWorkspace = async (
  data: CreateWorkspaceInput,
): Promise<ActionResponseType<WorkspaceResult>> => {
  const validated = createWorkspaceSchema.safeParse(data);
  if (!validated.success) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid input",
      validated.error.flatten().fieldErrors,
    );
  }

  const guard = await requireAuth();
  if (!guard.ok) return guard.error;

  try {
    const userId = guard.value.id;

    // 1. Enforce plan-based workspace count limit
    const limitCheck = await assertCanCreateWorkspace(userId);
    if (!limitCheck.ok) return limitCheck.error;

    // 2. Create workspace + subscription in a transaction
    const workspace = await db.$transaction(async (tx) => {
      const ws = await tx.workspace.create({
        data: {
          name: validated.data.name,
          ownerId: userId,
          subscription: {
            create: { plan: "FREE", status: "ACTIVE" },
          },
        },
      });

      // Set as active workspace
      await tx.user.update({
        where: { id: userId },
        data: { activeWorkspaceId: ws.id },
      });

      return ws;
    });

    revalidateAll();
    return ActionResponse.success(workspace, "Workspace created successfully");
  } catch (error) {
    return toActionError(error, {
      fallback: "Failed to create the workspace.",
    });
  }
};

/**
 * Switch the user's active workspace.
 * Validates the workspace belongs to the caller — no cross-tenant switching.
 */
export const switchWorkspace = async (
  data: WorkspaceIdInput,
): Promise<ActionResponseType<SwitchWorkspaceResult>> => {
  const validated = workspaceIdSchema.safeParse(data);
  if (!validated.success) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid input",
      validated.error.flatten().fieldErrors,
    );
  }

  const guard = await requireAuth();
  if (!guard.ok) return guard.error;

  try {
    const userId = guard.value.id;

    // Verify the workspace belongs to this user (ownership check)
    const workspace = await db.workspace.findFirst({
      where: { id: validated.data.id, ownerId: userId },
    });

    if (!workspace) {
      return ActionResponse.failure(
        ERROR_CODES.NOT_FOUND,
        "Workspace not found or you don't have access.",
      );
    }

    // Update active workspace
    await db.user.update({
      where: { id: userId },
      data: { activeWorkspaceId: workspace.id },
    });

    revalidateAll();
    return ActionResponse.success(
      { workspace },
      `Switched to "${workspace.name}"`,
    );
  } catch (error) {
    return toActionError(error, {
      fallback: "Failed to switch workspace.",
    });
  }
};

/**
 * Rename the current user's active workspace.
 */
export const updateWorkspace = async (
  data: UpdateWorkspaceInput,
): Promise<ActionResponseType<WorkspaceResult>> => {
  const validated = updateWorkspaceSchema.safeParse(data);
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
    const workspace = await db.workspace.update({
      where: { id: guard.value.workspace.id },
      data: { name: validated.data.name },
    });
    revalidateAll();
    return ActionResponse.success(workspace, "Workspace updated successfully");
  } catch (error) {
    return toActionError(error, {
      fallback: "Failed to update the workspace.",
    });
  }
};

/**
 * ⚠️ Destructive: deleting the workspace cascades to ALL owned data
 * (clients, projects, deliverables, invoices, activities, …).
 */
export const deleteWorkspace = async (): Promise<
  ActionResponseType<DeleteWorkspaceResult>
> => {
  const guard = await requireWorkspace();
  if (!guard.ok) return guard.error;

  try {
    await db.workspace.delete({ where: { id: guard.value.workspace.id } });
    revalidateAll();
    return ActionResponse.success({ deleted: true }, "Workspace deleted");
  } catch (error) {
    return toActionError(error, {
      fallback: "Failed to delete the workspace.",
    });
  }
};
