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
 * Resolves the current user AND the freelancer-owned workspace.
 * A freelancer owns exactly one workspace for MVP simplicity.
 */
export const requireWorkspace = async (): Promise<
  Guarded<WorkspaceContext>
> => {
  const authResult = await requireAuth();
  if (!authResult.ok) return authResult;

  const workspace = await db.workspace.findUnique({
    where: { ownerId: authResult.value.id },
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
