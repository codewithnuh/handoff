"use server";

import type { Workspace } from "@/app/generated/prisma/client";
import { db } from "@/lib/prisma";
import { defineAction, ensure } from "@/lib/actions/define";
import {
  requireAuth,
  requireWorkspaceAdmin,
  resolveWorkspace,
} from "@/lib/access";
import { ERROR_CODES } from "@/lib/constants/errors";
import { assertCanCreateWorkspace } from "@/lib/services/plan-limits";
import type { ActionResponseType } from "@/lib/types/action";
import { ActionResponse } from "@/lib/utils/action-response";
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  workspaceIdSchema,
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

// ──────────────────────────────────────────────
// Server Actions
// ──────────────────────────────────────────────

/**
 * Get the current user's active workspace (null when none exists yet).
 */
export const getCurrentWorkspace = defineAction({
  guard: requireAuth,
  errors: { fallback: "Failed to load the workspace." },
  run: async (ctx): Promise<ActionResponseType<WorkspaceResult | null>> => {
    const workspace = await resolveWorkspace(ctx.id);

    return ActionResponse.success(
      workspace,
      workspace ? "Workspace loaded" : "No workspace found",
    );
  },
});

/**
 * List all workspaces the current user owns or is a member of,
 * with the active one flagged.
 */
export const listWorkspaces = defineAction({
  guard: requireAuth,
  errors: { fallback: "Failed to load workspaces." },
  run: async (ctx): Promise<ActionResponseType<WorkspaceListResult>> => {
    const userId = ctx.id;

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
  },
});

/**
 * Create a new workspace for the current user.
 * Enforces plan-based workspace count limits.
 */
export const createWorkspace = defineAction({
  schema: createWorkspaceSchema,
  guard: requireAuth,
  // 1. Enforce plan-based workspace count limit
  check: ensure((ctx) => assertCanCreateWorkspace(ctx.id)),
  revalidate: true,
  errors: { fallback: "Failed to create the workspace." },
  run: async (input, ctx): Promise<ActionResponseType<WorkspaceResult>> => {
    const userId = ctx.id;

    // 2. Create workspace in a transaction
    const workspace = await db.$transaction(async (tx) => {
      const ws = await tx.workspace.create({
        data: {
          name: input.name,
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

    return ActionResponse.success(workspace, "Workspace created successfully");
  },
});

/**
 * Switch the user's active workspace.
 * Validates the caller owns the workspace OR is a member — no cross-tenant
 * switching.
 */
export const switchWorkspace = defineAction({
  schema: workspaceIdSchema,
  guard: requireAuth,
  revalidate: true,
  errors: { fallback: "Failed to switch workspace." },
  run: async (
    input,
    ctx,
  ): Promise<ActionResponseType<SwitchWorkspaceResult>> => {
    const userId = ctx.id;

    // Verify access: owner OR active membership
    const workspace = await db.workspace.findFirst({
      where: {
        id: input.id,
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

    return ActionResponse.success(
      { workspace },
      `Switched to "${workspace.name}"`,
    );
  },
});

/**
 * Rename the active workspace (owner or admin only).
 */
export const updateWorkspace = defineAction({
  schema: updateWorkspaceSchema,
  guard: requireWorkspaceAdmin,
  revalidate: true,
  errors: { fallback: "Failed to update the workspace." },
  run: async (input, ctx): Promise<ActionResponseType<WorkspaceResult>> => {
    const workspace = await db.workspace.update({
      where: { id: ctx.workspace.id },
      data: { name: input.name },
    });
    return ActionResponse.success(workspace, "Workspace updated successfully");
  },
});

/**
 * ⚠️ Destructive: deleting the workspace cascades to its clients, projects,
 * and project data. Invoice references restrict deletion to preserve history.
 * Owner only.
 */
export const deleteWorkspace = defineAction({
  guard: requireWorkspaceAdmin,
  check: (ctx) =>
    ctx.isOwner
      ? null
      : ActionResponse.failure(
          ERROR_CODES.FORBIDDEN,
          "Only the workspace owner can delete the workspace.",
        ),
  revalidate: true,
  errors: {
    fallback: "Failed to delete the workspace.",
    referenced: "This workspace contains invoices. Preserve financial history before deleting it.",
  },
  run: async (ctx): Promise<ActionResponseType<DeleteWorkspaceResult>> => {
    await db.workspace.delete({ where: { id: ctx.workspace.id } });
    return ActionResponse.success({ deleted: true }, "Workspace deleted");
  },
});
