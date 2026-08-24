import { headers } from "next/headers";
import type { Workspace } from "@/app/generated/prisma/client";
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

export type WorkspaceContext = { user: AuthUser; workspace: Workspace };

/**
 * Resolves the current user AND their active workspace.
 *
 * Strategy:
 * 1. Read the user's `activeWorkspaceId` from the database.
 * 2. Load that workspace and **verify ownership** in a single query
 *    (ownerId === userId) so a tampered activeWorkspaceId can never
 *    grant access to another user's workspace.
 * 3. Fallback: if the active workspace is missing or ownership fails,
 *    auto-heal by picking the user's first workspace.
 */
export const requireWorkspace = async (): Promise<
  Guarded<WorkspaceContext>
> => {
  const authResult = await requireAuth();
  if (!authResult.ok) return authResult;

  const userId = authResult.value.id;

  // 1. Try the active workspace first — ownership is verified in the query
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { activeWorkspaceId: true },
  });

  if (user?.activeWorkspaceId) {
    const workspace = await db.workspace.findFirst({
      where: { id: user.activeWorkspaceId, ownerId: userId },
    });
    if (workspace) {
      return { ok: true, value: { user: authResult.value, workspace } };
    }
    // activeWorkspaceId points to a deleted or unowned workspace — clear it
    await db.user.update({
      where: { id: userId },
      data: { activeWorkspaceId: null },
    }).catch(() => {});
  }

  // 2. Fallback: pick the first owned workspace and auto-heal
  const workspace = await db.workspace.findFirst({
    where: { ownerId: userId },
    orderBy: { createdAt: "asc" },
  });

  if (!workspace) {
    return {
      ok: false,
      error: ActionResponse.failure(
        ERROR_CODES.NOT_FOUND,
        "No workspace found for this account. Create a workspace first.",
      ),
    };
  }

  // Auto-heal: set the fallback as the active workspace
  await db.user.update({
    where: { id: userId },
    data: { activeWorkspaceId: workspace.id },
  }).catch(() => {});

  return { ok: true, value: { user: authResult.value, workspace } };
};

/**
 * Verifies a project belongs to the caller's workspace.
 * Returns the project on success, otherwise a `FORBIDDEN`/`NOT_FOUND` error.
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
 * Returns the client id on success, otherwise a `FORBIDDEN`/`NOT_FOUND` error.
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
