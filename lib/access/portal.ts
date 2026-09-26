import { db } from "@/lib/prisma";
import { ERROR_CODES } from "@/lib/constants/errors";
import { ActionResponse } from "@/lib/utils/action-response";

import { getPortalSession } from "@/lib/access/subject";
import type { Guarded, PortalSession } from "@/lib/access/types";

/**
 * Requires a valid client-portal session (signed `cp_session` cookie).
 * This is the portal's equivalent of `requireAuth` — the session band that
 * every client-facing action, page and route handler sits behind.
 */
export const requirePortalSession = async (): Promise<
  Guarded<PortalSession>
> => {
  const session = await getPortalSession();
  if (!session) {
    return {
      ok: false,
      error: ActionResponse.failure(
        ERROR_CODES.UNAUTHORIZED,
        "Not authenticated",
      ),
    };
  }
  return { ok: true, value: session };
};

/**
 * Verifies a client has access to a specific project. Every portal entry
 * point — actions, pages, downloads, queries — routes through this one
 * check instead of re-querying ProjectAccess itself.
 */
export const requirePortalProjectAccess = async (
  email: string,
  projectId: string,
): Promise<Guarded<{ projectId: string }>> => {
  const access = await db.projectAccess.findUnique({
    where: { projectId_email: { projectId, email } },
    select: { id: true },
  });

  if (!access) {
    return {
      ok: false,
      error: ActionResponse.failure(
        ERROR_CODES.FORBIDDEN,
        "You don't have access to this project.",
      ),
    };
  }

  return { ok: true, value: { projectId } };
};
