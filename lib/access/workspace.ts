import type { Workspace, WorkspacePermission } from "@/app/generated/prisma/client";
import { db } from "@/lib/prisma";
import { ERROR_CODES } from "@/lib/constants/errors";
import { ActionResponse } from "@/lib/utils/action-response";

import { requireAuth } from "@/lib/access/subject";
import type { Guarded, WorkspaceContext } from "@/lib/access/types";

/**
 * Resolves the user's active workspace — the single implementation shared by
 * `requireWorkspace` (guards) and `getCurrentWorkspace` (the dashboard
 * action). Access is verified in the query itself so a tampered
 * `activeWorkspaceId` can never grant cross-tenant access.
 *
 * Strategy:
 * 1. Read `activeWorkspaceId`, verify owner-or-member, auto-clear a stale id.
 * 2. Fallback: first owned workspace, then first membership.
 * 3. Auto-heal: persist the resolved workspace as active.
 *
 * Returns null when the account has no workspace at all.
 */
export const resolveWorkspace = async (
  userId: string,
): Promise<Workspace | null> => {
  const accessibleWhere = {
    OR: [{ ownerId: userId }, { members: { some: { userId } } }],
  };

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { activeWorkspaceId: true },
  });

  let workspace: Workspace | null = null;

  if (user?.activeWorkspaceId) {
    workspace = await db.workspace.findFirst({
      where: { id: user.activeWorkspaceId, ...accessibleWhere },
    });
    if (!workspace) {
      // activeWorkspaceId points to an inaccessible workspace — clear it
      await db.user
        .update({
          where: { id: userId },
          data: { activeWorkspaceId: null },
        })
        .catch(() => {});
    }
  }

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
      include: { workspace: true },
    });
    workspace = membership?.workspace ?? null;
  }

  if (workspace && user?.activeWorkspaceId !== workspace.id) {
    await db.user
      .update({
        where: { id: userId },
        data: { activeWorkspaceId: workspace.id },
      })
      .catch(() => {});
  }

  return workspace;
};

/**
 * Resolves the current user AND their active workspace, including the
 * caller's standing in it (owner vs admin vs member).
 */
export const requireWorkspace = async (): Promise<
  Guarded<WorkspaceContext>
> => {
  const authResult = await requireAuth();
  if (!authResult.ok) return authResult;

  const user = authResult.value;
  const workspace = await resolveWorkspace(user.id);

  if (!workspace) {
    return {
      ok: false,
      error: ActionResponse.failure(
        ERROR_CODES.NOT_FOUND,
        "No workspace found for this account. Create a workspace first.",
      ),
    };
  }

  const isOwner = workspace.ownerId === user.id;

  let isAdmin = isOwner;
  let memberRole: "ADMIN" | "MEMBER" | null = null;
  let permissions: WorkspacePermission[] = [];

  if (!isOwner) {
    const membership = await db.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
      select: { role: true, permissions: true },
    });
    isAdmin = membership?.role === "ADMIN";
    memberRole = membership?.role ?? null;
    permissions = membership?.permissions ?? [];
  }

  return {
    ok: true,
    value: { user, workspace, isOwner, isAdmin, memberRole, permissions },
  };
};

/** Requires owner or workspace admin; otherwise `FORBIDDEN`. */
export const requireWorkspaceAdmin = async (): Promise<
  Guarded<WorkspaceContext>
> => {
  const guard = await requireWorkspace();
  if (!guard.ok) return guard;
  if (!guard.value.isAdmin) {
    return {
      ok: false,
      error: ActionResponse.failure(
        ERROR_CODES.FORBIDDEN,
        "Only the workspace owner or an admin can perform this action.",
      ),
    };
  }
  return guard;
};

/**
 * Requires a specific workspace permission (or owner/admin status).
 * Owners and admins always pass; non-admins must have the permission in their list.
 */
export const requireWorkspacePermission = async (
  permission: WorkspacePermission,
): Promise<Guarded<WorkspaceContext>> => {
  const guard = await requireWorkspace();
  if (!guard.ok) return guard;
  if (guard.value.isAdmin) return guard;
  if (guard.value.permissions.includes(permission)) return guard;
  return {
    ok: false,
    error: ActionResponse.failure(
      ERROR_CODES.FORBIDDEN,
      "You don't have permission to perform this action.",
    ),
  };
};
