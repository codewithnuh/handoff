/**
 * The authorization module: one interface for workspace, project and portal
 * access, callable from server actions, pages and route handlers alike.
 *
 * Adapters behind it (lib/access/subject.ts):
 *   better-auth session cookie · signed portal cookie · injected in tests
 */

export type {
  EffectiveRole,
  Guarded,
  PortalSession,
  ProjectAccess,
  WorkspaceContext,
} from "@/lib/access/types";

export {
  getPortalSession,
  getRequestSubject,
  getSessionUser,
  requireAuth,
  setSubjectAdapters,
} from "@/lib/access/subject";
export type { RequestSubject, SubjectAdapters } from "@/lib/access/subject";

export {
  requireWorkspace,
  requireWorkspaceAdmin,
  requireWorkspacePermission,
  resolveWorkspace,
} from "@/lib/access/workspace";

export {
  getVisibleProjectIds,
  requireClientInWorkspace,
  requireProjectInWorkspace,
  resolveProjectAccess,
} from "@/lib/access/project";

export {
  requirePortalProjectAccess,
  requirePortalSession,
} from "@/lib/access/portal";
