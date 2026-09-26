/**
 * Server-side data access layer for shared query context helpers.
 *
 * These helpers run directly in Server Components — no server-action
 * boilerplate (validation, revalidation, action-response wrappers).
 * Every function starts with the workspace auth guard so we never
 * leak data across tenants.
 */

import {
  getVisibleProjectIds,
  requireWorkspace,
} from "@/lib/access";
import type { WorkspaceContext } from "@/lib/access";

// ──────────────────────────────────────────────
// Helpers: auth context + need-to-know scoping
// ──────────────────────────────────────────────

export async function getContext(): Promise<WorkspaceContext> {
  const guard = await requireWorkspace();
  if (!guard.ok) throw guard.error;
  return guard.value;
}

/** Prisma `project` filter limiting results to the caller's visible projects. */
export async function projectScope(
  ctx: WorkspaceContext,
): Promise<{ workspaceId: string; id?: { in: string[] } }> {
  const visibleIds = await getVisibleProjectIds(
    ctx.workspace.id,
    ctx.user.id,
    ctx.isAdmin,
  );
  return {
    workspaceId: ctx.workspace.id,
    ...(visibleIds ? { id: { in: visibleIds } } : {}),
  };
}

export async function getWorkspaceId(): Promise<string> {
  return (await getContext()).workspace.id;
}
