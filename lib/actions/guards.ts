import { headers } from "next/headers";
import type { Workspace, WorkspacePermission } from "@/app/generated/prisma/client";
import { db } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { AuthUser } from "@/lib/auth";
import { ERROR_CODES } from "@/lib/constants/errors";
import type { ActionError } from "@/lib/types/action";
import { ActionResponse } from "@/lib/utils/action-response";
import { toActionError } from "@/lib/actions/helpers";

/**
 * Discriminated union used by every action: either a typed payload or a
 * ready-to-return standardized error that the action short-circuits on.
 */
export type Guarded<T> =
  | { ok: true; value: T }
  | { ok: false; error: ActionError };

/**
 * Returns the current signed-in user, or an `UNAUTHORIZED` failure.
 * Every server action must start with an auth guard.
 */
export const requireAuth = async (): Promise<Guarded<AuthUser>> => {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return {
        ok: false,
        error: ActionResponse.failure(
          ERROR_CODES.UNAUTHORIZED,
          "You must be signed in to perform this action.",
        ),
      };
    }
    return { ok: true, value: session.user };
  } catch (error) {
    return {
      ok: false,
      error: toActionError(error, {
        fallback: "Failed to verify your session. Please try again.",
      }),
    };
  }
};

export type WorkspaceContext = {
  user: AuthUser;
  workspace: Workspace;
  /** True when the user owns this workspace */
  isOwner: boolean;
  /** True for the owner OR a workspace admin — full control over all projects */
  isAdmin: boolean;
  /** The user's workspace role (for non-owners: ADMIN or MEMBER) */
  memberRole: "ADMIN" | "MEMBER" | null;
  /** Granular permissions assigned to this member (empty for owners who have implicit full access) */
  permissions: WorkspacePermission[];
};

/**
 * Resolves the current user AND their active workspace, including the
 * caller's standing in it (owner vs admin vs member).
 *
 * Strategy:
 * 1. Read the user's `activeWorkspaceId`, load the workspace, and verify
 *    access in a single query (owner OR active membership) so a tampered
 *    activeWorkspaceId can never grant cross-tenant access.
 * 2. Fallback: auto-heal by picking the user's first owned workspace,
 *    then their first membership.
 */
export const requireWorkspace = async (): Promise<
  Guarded<WorkspaceContext>
> => {
  const authResult = await requireAuth();
  if (!authResult.ok) return authResult;

  const userId = authResult.value.id;

  const accessibleWhere = {
    OR: [{ ownerId: userId }, { members: { some: { userId } } }],
  };

  // 1. Try the active workspace first — access is verified in the query
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { activeWorkspaceId: true },
  });

  let workspace = null;

  if (user?.activeWorkspaceId) {
    workspace = await db.workspace.findFirst({
      where: { id: user.activeWorkspaceId, ...accessibleWhere },
    });
    if (!workspace) {
      // activeWorkspaceId points to an inaccessible workspace — clear it
      await db.user.update({
        where: { id: userId },
        data: { activeWorkspaceId: null },
      }).catch(() => {});
    }
  }

  // 2. Fallback: pick the first owned workspace, then the first membership
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

  if (!workspace) {
    return {
      ok: false,
      error: ActionResponse.failure(
        ERROR_CODES.NOT_FOUND,
        "No workspace found for this account. Create a workspace first.",
      ),
    };
  }

  // Auto-heal: persist the resolved workspace as active
  if (user?.activeWorkspaceId !== workspace.id) {
    await db.user.update({
      where: { id: userId },
      data: { activeWorkspaceId: workspace.id },
    }).catch(() => {});
  }

  const isOwner = workspace.ownerId === userId;

  let isAdmin = isOwner;
  let memberRole: "ADMIN" | "MEMBER" | null = null;
  let permissions: WorkspacePermission[] = [];

  if (!isOwner) {
    const membership = await db.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId } },
      select: { role: true, permissions: true },
    });
    isAdmin = membership?.role === "ADMIN";
    memberRole = membership?.role ?? null;
    permissions = membership?.permissions ?? [];
  }

  return {
    ok: true,
    value: { user: authResult.value, workspace, isOwner, isAdmin, memberRole, permissions },
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

// ──────────────────────────────────────────────
// Project-level access (RBAC level 2)
// ──────────────────────────────────────────────

export type EffectiveRole =
  | "OWNER"
  | "ADMIN"
  | "LEAD"
  | "CONTRIBUTOR"
  | "OBSERVER";

export type ProjectAccess = {
  projectId: string;
  workspaceId: string;
  /** The authenticated caller — handy for activity logging */
  user: AuthUser;
  role: EffectiveRole;
  /** Can edit project name/description/dates/status/progress */
  canEditProject: boolean;
  /** Owner/admin only — destructive */
  canDeleteProject: boolean;
  /** Can create/edit draft deliverables and upload versions */
  canManageDeliverables: boolean;
  /**
   * Quality gate: submit drafts to the client (IN_REVIEW), pull back to
   * DRAFT, delete deliverables, and manage client portal invitations.
   */
  canSubmitForReview: boolean;
  /** Client-initiated request status tracking */
  canUpdateRequests: boolean;
  /** Read-only member */
  isObserver: boolean;
};

const OWNER_ACCESS = (
  projectId: string,
  workspaceId: string,
  user: AuthUser,
): ProjectAccess => ({
  projectId,
  workspaceId,
  user,
  role: "OWNER",
  canEditProject: true,
  canDeleteProject: true,
  canManageDeliverables: true,
  canSubmitForReview: true,
  canUpdateRequests: true,
  isObserver: false,
});

/**
 * Resolves what the current user can do on a specific project:
 * - Workspace owner/admin → full control over every project.
 * - Otherwise needs a ProjectMember row (need-to-know scoping):
 *   LEAD / CONTRIBUTOR / OBSERVER map to progressively fewer rights.
 */
export const resolveProjectAccess = async (
  projectId: string,
): Promise<Guarded<ProjectAccess>> => {
  const guard = await requireWorkspace();
  if (!guard.ok) return guard;

  const { user, workspace, isAdmin, isOwner } = guard.value;

  const project = await db.project.findFirst({
    where: { id: projectId, workspaceId: workspace.id },
    select: { id: true, workspaceId: true },
  });
  if (!project) {
    return {
      ok: false,
      error: ActionResponse.failure(
        ERROR_CODES.NOT_FOUND,
        "The project was not found in this workspace.",
      ),
    };
  }

  if (isOwner || isAdmin) {
    return {
      ok: true,
      value: OWNER_ACCESS(project.id, workspace.id, guard.value.user),
    };
  }

  const membership = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId: project.id, userId: user.id } },
    select: { role: true },
  });

  if (!membership) {
    return {
      ok: false,
      error: ActionResponse.failure(
        ERROR_CODES.FORBIDDEN,
        "You don't have access to this project.",
      ),
    };
  }

  switch (membership.role) {
    case "LEAD":
      return {
        ok: true,
        value: {
          projectId: project.id,
          workspaceId: workspace.id,
          user,
          role: "LEAD",
          canEditProject: true,
          canDeleteProject: false,
          canManageDeliverables: true,
          canSubmitForReview: true,
          canUpdateRequests: true,
          isObserver: false,
        },
      };
    case "CONTRIBUTOR":
      return {
        ok: true,
        value: {
          projectId: project.id,
          workspaceId: workspace.id,
          user,
          role: "CONTRIBUTOR",
          canEditProject: false,
          canDeleteProject: false,
          canManageDeliverables: true,
          canSubmitForReview: false,
          canUpdateRequests: false,
          isObserver: false,
        },
      };
    default: // OBSERVER
      return {
        ok: true,
        value: {
          projectId: project.id,
          workspaceId: workspace.id,
          user,
          role: "OBSERVER",
          canEditProject: false,
          canDeleteProject: false,
          canManageDeliverables: false,
          canSubmitForReview: false,
          canUpdateRequests: false,
          isObserver: true,
        },
      };
  }
};

/**
 * Returns the list of project IDs visible to a user in a workspace.
 * Returns `null` when the user sees ALL projects (owner/admin).
 */
export const getVisibleProjectIds = async (
  workspaceId: string,
  userId: string,
  isAdmin: boolean,
): Promise<string[] | null> => {
  if (isAdmin) return null;
  const rows = await db.projectMember.findMany({
    where: { userId, project: { workspaceId } },
    select: { projectId: true },
  });
  return rows.map((r) => r.projectId);
};

/**
 * Verifies a project belongs to the caller's workspace.
 * Returns the project on success, otherwise a `NOT_FOUND` error.
 */
export const requireProjectInWorkspace = async (
  workspaceId: string,
  projectId: string,
): Promise<Guarded<{ projectId: string }>> => {
  const project = await db.project.findFirst({
    where: { id: projectId, workspaceId },
    select: { id: true },
  });
  if (!project) {
    return {
      ok: false,
      error: ActionResponse.failure(
        ERROR_CODES.NOT_FOUND,
        "The project was not found in this workspace.",
      ),
    };
  }
  return { ok: true, value: { projectId: project.id } };
};

/**
 * Verifies a client belongs to the caller's workspace.
 * Returns the client id on success, otherwise a `NOT_FOUND` error.
 */
export const requireClientInWorkspace = async (
  workspaceId: string,
  clientId: string,
): Promise<Guarded<{ clientId: string }>> => {
  const client = await db.client.findFirst({
    where: { id: clientId, workspaceId },
    select: { id: true },
  });
  if (!client) {
    return {
      ok: false,
      error: ActionResponse.failure(
        ERROR_CODES.NOT_FOUND,
        "The client was not found in this workspace.",
      ),
    };
  }
  return { ok: true, value: { clientId: client.id } };
};
