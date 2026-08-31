"use server";

import type { Workspace } from "@/app/generated/prisma/client";
import { db } from "@/lib/prisma";
import { revalidateDashboard } from "@/lib/actions/revalidate";
import { toActionError } from "@/lib/actions/helpers";
import {
  requireAuth,
  requireWorkspaceAdmin,
} from "@/lib/actions/guards";
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
  /** The user's role in this workspace */
  role: "OWNER" | "ADMIN" | "MEMBER";
  /** Owner's display name — useful for disambiguating identically-named workspaces */
  ownerName: string | null;
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
        where: {
          id: user.activeWorkspaceId,
          OR: [{ ownerId: userId }, { members: { some: { userId } } }],
        },
      });
    }

    // Fallback: if active workspace is inaccessible, pick the first owned,
    // then the first membership
    if (!workspace) {
      workspace = await db.workspace.findFirst({
        where: { ownerId: userId },
        orderBy: { createdAt: "asc" },
      });
    }

    if (!workspace) {
      const membership = await db.workspaceMember.findFirst({
        where: { userId },
        orderBy: { createdAt: "asc" },
        include: { workspace: {  } },
      });
      workspace = membership?.workspace ?? null;
    }

    if (workspace) {
      await db.user.update({
        where: { id: userId },
        data: { activeWorkspaceId: workspace.id },
      }).catch(() => {});
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
 * List all workspaces the current user owns or is a member of,
 * with the active one flagged.
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

    const [owned, memberships] = await Promise.all([
      db.workspace.findMany({
        where: { ownerId: userId },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, owner: { select: { name: true } } },
      }),
      db.workspaceMember.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
        select: {
          workspaceId: true,
          role: true,
          workspace: {
            select: { id: true, name: true, ownerId: true, owner: { select: { name: true } } },
          },
        },
      }),
    ]);

    const items: WorkspaceListItem[] = [
      ...owned.map((ws) => ({
        id: ws.id,
        name: ws.name,
        isOwner: true,
        isActive: ws.id === user?.activeWorkspaceId,
        role: "OWNER" as const,
        ownerName: ws.owner.name,
      })),
      ...memberships
        .filter((m) => m.workspace.ownerId !== userId)
        .map((m) => ({
          id: m.workspace.id,
          name: m.workspace.name,
          isOwner: false,
          isActive: m.workspaceId === user?.activeWorkspaceId,
          role: (m.role === "ADMIN" ? "ADMIN" : "MEMBER") as "ADMIN" | "MEMBER",
          ownerName: m.workspace.owner.name,
        })),
    ];

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

    // 2. Create workspace in a transaction
    const workspace = await db.$transaction(async (tx) => {
      const ws = await tx.workspace.create({
        data: {
          name: validated.data.name,
          ownerId: userId,
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
 * Validates the caller owns the workspace OR is a member — no cross-tenant
 * switching.
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

    // Verify access: owner OR active membership
    const workspace = await db.workspace.findFirst({
      where: {
        id: validated.data.id,
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
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
 * Rename the active workspace (owner or admin only).
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

  const guard = await requireWorkspaceAdmin();
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
 * Owner only.
 */
export const deleteWorkspace = async (): Promise<
  ActionResponseType<DeleteWorkspaceResult>
> => {
  const guard = await requireWorkspaceAdmin();
  if (!guard.ok) return guard.error;

  if (!guard.value.isOwner) {
    return ActionResponse.failure(
      ERROR_CODES.FORBIDDEN,
      "Only the workspace owner can delete the workspace.",
    );
  }

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
