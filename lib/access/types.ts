import type {
  Workspace,
  WorkspacePermission,
} from "@/app/generated/prisma/client";
import type { AuthUser } from "@/lib/auth";
import type { ActionError } from "@/lib/types/action";

/**
 * Discriminated union used by every guard: either a typed payload or a
 * ready-to-return standardized error that the caller short-circuits on.
 */
export type Guarded<T> =
  | { ok: true; value: T }
  | { ok: false; error: ActionError };

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

export type PortalSession = {
  sessionId: string;
  email: string;
};
