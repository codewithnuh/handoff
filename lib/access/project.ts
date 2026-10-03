import { db } from "@/lib/prisma";
import { ERROR_CODES } from "@/lib/constants/errors";
import { ActionResponse } from "@/lib/utils/action-response";

import { requireWorkspace } from "@/lib/access/workspace";
import type {
  EffectiveRole,
  Guarded,
  ProjectAccess,
} from "@/lib/access/types";

const OWNER_ACCESS = (
  projectId: string,
  workspaceId: string,
  user: ProjectAccess["user"],
  isWorkspaceOwner: boolean,
): ProjectAccess => ({
  projectId,
  workspaceId,
  user,
  role: "OWNER",
  isWorkspaceOwner,
  canEditProject: true,
  canDeleteProject: true,
  canManageDeliverables: true,
  canSubmitForReview: true,
  canUpdateRequests: true,
  isObserver: false,
});

const MEMBER_ACCESS: Record<
  Extract<EffectiveRole, "LEAD" | "CONTRIBUTOR" | "OBSERVER">,
  Pick<
    ProjectAccess,
    | "canEditProject"
    | "canDeleteProject"
    | "canManageDeliverables"
    | "canSubmitForReview"
    | "canUpdateRequests"
    | "isObserver"
  >
> = {
  LEAD: {
    canEditProject: true,
    canDeleteProject: false,
    canManageDeliverables: true,
    canSubmitForReview: true,
    canUpdateRequests: true,
    isObserver: false,
  },
  CONTRIBUTOR: {
    canEditProject: false,
    canDeleteProject: false,
    canManageDeliverables: true,
    canSubmitForReview: false,
    canUpdateRequests: false,
    isObserver: false,
  },
  OBSERVER: {
    canEditProject: false,
    canDeleteProject: false,
    canManageDeliverables: false,
    canSubmitForReview: false,
    canUpdateRequests: false,
    isObserver: true,
  },
};

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
      value: OWNER_ACCESS(project.id, workspace.id, user, isOwner),
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

  const role: EffectiveRole =
    membership.role === "LEAD" || membership.role === "CONTRIBUTOR"
      ? membership.role
      : "OBSERVER";

  const access = MEMBER_ACCESS[role];

  return {
    ok: true,
    value: {
      projectId: project.id,
      workspaceId: workspace.id,
      user,
      role,
      isWorkspaceOwner: false,
      ...access,
    },
  };
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
