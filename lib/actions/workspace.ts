"use server";

import { revalidatePath } from "next/cache";
import type { Workspace } from "@/app/generated/prisma/client";
import { db } from "@/lib/prisma";
import { toActionError } from "@/lib/actions/helpers";
import { requireAuth, requireWorkspace } from "@/lib/actions/guards";
import { ERROR_CODES } from "@/lib/constants/errors";
import type { ActionResponseType } from "@/lib/types/action";
import { ActionResponse } from "@/lib/utils/action-response";
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
} from "@/lib/validation/workspace";
import type {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
} from "@/lib/validation/workspace";

// ──────────────────────────────────────────────
// Result types
// ──────────────────────────────────────────────

export type WorkspaceResult = Workspace;
export type WorkspaceListResult = { items: Workspace[] };
export type DeleteWorkspaceResult = { deleted: boolean };

const arena = "/";

// ──────────────────────────────────────────────
// Server Actions
// ──────────────────────────────────────────────

/**
 * Get the current user's workspace (null when none exists yet).
 */
export const getCurrentWorkspace = async (): Promise<
  ActionResponseType<WorkspaceResult | null>
> => {
  const guard = await requireAuth();
  if (!guard.ok) return guard.error;

  try {
    const userId = guard.value.id;

    // 1. Fetch user to check their active workspace selection
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { activeWorkspaceId: true },
    });

    let workspace = null;

    if (user?.activeWorkspaceId) {
      workspace = await db.workspace.findUnique({
        where: { id: user.activeWorkspaceId },
        include: {
          subscription: true, // Includes subscription if part of WorkspaceResult
        },
      });
    }

    // 2. Fallback: If activeWorkspaceId is missing or deleted, fetch their first workspace
    if (!workspace) {
      workspace = await db.workspace.findFirst({
        where: { ownerId: userId },
        orderBy: { createdAt: "asc" },
        include: {
          subscription: true,
        },
      });

      // 3. Auto-heal: Link activeWorkspaceId so future queries hit directly
      if (workspace) {
        await db.user.update({
          where: { id: userId },
          data: { activeWorkspaceId: workspace.id },
        });
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
 * Create the freelancer's workspace. A user owns only one workspace.
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
    const existing = await db.workspace.findFirst({
      where: { ownerId: guard.value.id },
    });
    if (existing) {
      return ActionResponse.failure(
        ERROR_CODES.CONFLICT,
        "You already have a workspace.",
      );
    }

    const workspace = await db.workspace.create({
      data: { name: validated.data.name, ownerId: guard.value.id },
    });
    revalidatePath(arena);
    return ActionResponse.success(workspace, "Workspace created successfully");
  } catch (error) {
    return toActionError(error, {
      fallback: "Failed to create the workspace.",
    });
  }
};

/**
 * Rename the current user's workspace.
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
    revalidatePath(arena);
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
    revalidatePath(arena);
    return ActionResponse.success({ deleted: true }, "Workspace deleted");
  } catch (error) {
    return toActionError(error, {
      fallback: "Failed to delete the workspace.",
    });
  }
};
