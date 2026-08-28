"use server";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import type { TeamInvitation } from "@/app/generated/prisma/client";
import { db } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { env } from "@/env";
import {
  teamInviteEmailHtml,
  sendEmail,
} from "@/lib/email";
import { toActionError } from "@/lib/actions/helpers";
import {
  requireWorkspace,
  requireWorkspaceAdmin,
  resolveProjectAccess,
} from "@/lib/actions/guards";
import { revalidateDashboard } from "@/lib/actions/revalidate";
import { ERROR_CODES } from "@/lib/constants/errors";
import type { ActionResponseType } from "@/lib/types/action";
import { ActionResponse } from "@/lib/utils/action-response";
import {
  acceptTeamInviteSchema,
  inviteTeammateSchema,
  listProjectMembersSchema,
  removeProjectMemberSchema,
  teamInviteIdSchema,
  teamMemberIdSchema,
  updateProjectMemberRoleSchema,
  updateTeamMemberRoleSchema,
} from "@/lib/validation/team";
import type {
  AcceptTeamInviteInput,
  InviteTeammateInput,
  ListProjectMembersInput,
  RemoveProjectMemberInput,
  TeamInviteIdInput,
  TeamMemberIdInput,
  UpdateProjectMemberRoleInput,
  UpdateTeamMemberRoleInput,
} from "@/lib/validation/team";

// ──────────────────────────────────────────────
// Result types
// ──────────────────────────────────────────────

export type TeamMember = {
  userId: string;
  name: string;
  email: string;
  /** Workspace standing — owners are not WorkspaceMember rows */
  role: "OWNER" | "ADMIN" | "MEMBER";
  createdAt: Date;
};

export type TeamMemberListResult = { items: TeamMember[] };

export type PendingTeamInvite = Omit<TeamInvitation, "token"> & {
  acceptUrl: string;
};
export type PendingTeamInviteListResult = { items: PendingTeamInvite[] };

export type TeamInviteWithStatus = PendingTeamInvite & {
  status: "PENDING" | "ACCEPTED" | "EXPIRED";
};
export type TeamInviteListResult = { items: TeamInviteWithStatus[] };

export type TeammateInviteResult = TeamInvitation & { acceptUrl: string };

export type ProjectMemberInfo = {
  userId: string;
  name: string;
  email: string;
  role: "LEAD" | "CONTRIBUTOR" | "OBSERVER";
};

export type ProjectMemberListResult = { items: ProjectMemberInfo[] };

const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

/** Builds the public accept URL for an invitation token. */
const teamAcceptUrl = (token: string) =>
  `${env.NEXT_PUBLIC_APP_URL}/invite/team/${token}`;

// ──────────────────────────────────────────────
// Internal helpers
// ──────────────────────────────────────────────

/**
 * Creates the membership rows for an accepted invitation:
 * WorkspaceMember (MEMBER) + one ProjectMember (CONTRIBUTOR) per assigned
 * project. Idempotent via unique-constraint upserts.
 */
async function grantInvitedAccess(
  workspaceId: string,
  userId: string,
  projectIds: string[],
) {
  await db.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId, userId } },
    create: { workspaceId, userId, role: "MEMBER" },
    update: {},
  });

  // Only assign projects that actually belong to this workspace
  const validProjects = await db.project.findMany({
    where: { id: { in: projectIds }, workspaceId },
    select: { id: true },
  });

  for (const project of validProjects) {
    await db.projectMember.upsert({
      where: {
        projectId_userId: { projectId: project.id, userId },
      },
      create: { projectId: project.id, userId, role: "CONTRIBUTOR" },
      update: {},
    });
  }

  // Only point a NEW freelancer at the joined workspace — never hijack the
  // active context of someone who already has their own workspaces.
  const [ownedCount, membershipCount] = await Promise.all([
    db.workspace.count({ where: { ownerId: userId } }),
    db.workspaceMember.count({ where: { userId } }),
  ]);
  const isBrandNew = ownedCount + membershipCount <= 1; // just this one
  if (isBrandNew) {
    await db.user
      .update({
        where: { id: userId },
        data: { activeWorkspaceId: workspaceId },
      })
      .catch(() => {});
  }
}

// ──────────────────────────────────────────────
// Server Actions — managing the team (admin only)
// ──────────────────────────────────────────────

/**
 * Invites a teammate by generating a set-password link.
 * The selected projects become their need-to-know scope on acceptance.
 */
export const inviteTeammate = async (
  data: InviteTeammateInput,
): Promise<ActionResponseType<TeammateInviteResult>> => {
  const validated = inviteTeammateSchema.safeParse(data);
  if (!validated.success) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid input",
      validated.error.flatten().fieldErrors,
    );
  }

  const guard = await requireWorkspaceAdmin();
  if (!guard.ok) return guard.error;

  try {
    const workspaceId = guard.value.workspace.id;
    const email = validated.data.email.toLowerCase();

    // ── Account boundary guards ──
    // Don't invite someone who's already on the team.
    const owner = await db.user.findUnique({
      where: { id: guard.value.workspace.ownerId },
      select: { email: true },
    });
    if (owner?.email.toLowerCase() === email) {
      return ActionResponse.failure(
        ERROR_CODES.VALIDATION_ERROR,
        "That person is the workspace owner.",
      );
    }

    const memberRows = await db.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: { select: { email: true } } },
    });
    if (memberRows.some((m) => m.user.email.toLowerCase() === email)) {
      return ActionResponse.failure(
        ERROR_CODES.CONFLICT,
        "That person is already a member of this workspace.",
      );
    }

    // One pending invite per email
    const pending = await db.teamInvitation.findFirst({
      where: {
        workspaceId,
        email,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });
    if (pending) {
      return ActionResponse.failure(
        ERROR_CODES.CONFLICT,
        "There's already a pending invite for this email. Revoke it first to re-invite.",
      );
    }

    // Whether this email already has a Handoff account — the accept flow
    // must never ask an existing user to "set" a second password.
    const existingUser = await db.user.findUnique({
      where: { email },
      select: { id: true },
    });

    // Validate assigned projects belong to this workspace
    const validProjects = await db.project.findMany({
      where: {
        id: { in: validated.data.projectIds ?? [] },
        workspaceId,
      },
      select: { id: true },
    });

    const invitation = await db.teamInvitation.create({
      data: {
        workspaceId,
        email,
        token: randomBytes(32).toString("hex"),
        invitedByEmail: guard.value.user.email,
        projectIds: validProjects.map((p) => p.id),
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      },
    });

    // Deliver the invite by email. The link also stays copyable in the UI
    // as a fallback, so a transport failure must not fail the invite.
    await sendEmail({
      to: email,
      subject: `You've been invited to ${guard.value.workspace.name} on Handoff`,
      text:
        `${guard.value.user.name} invited you to collaborate in ` +
        `"${guard.value.workspace.name}". Accept here: ${teamAcceptUrl(invitation.token)}`,
      html: teamInviteEmailHtml(
        guard.value.user.name,
        guard.value.workspace.name,
        teamAcceptUrl(invitation.token),
      ),
    }).catch((err) => {
      console.error("Failed to send team invite email:", err);
    });

    revalidateDashboard();
    return ActionResponse.success(
      { ...invitation, acceptUrl: teamAcceptUrl(invitation.token) },
      existingUser
        ? "Invite link generated. They already use Handoff, so they'll sign in with their existing password to accept it."
        : "Invite link generated. Copy and share it with your teammate.",
    );
  } catch (error) {
    return toActionError(error, { fallback: "Failed to create the invite." });
  }
};

/** Lists pending (unaccepted, unexpired) teammate invites with accept URLs. */
export const listPendingTeamInvites = async (): Promise<
  ActionResponseType<PendingTeamInviteListResult>
> => {
  const guard = await requireWorkspaceAdmin();
  if (!guard.ok) return guard.error;

  try {
    const invitations = await db.teamInvitation.findMany({
      where: {
        workspaceId: guard.value.workspace.id,
        acceptedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });
    return ActionResponse.success(
      {
        items: invitations.map(({ token, ...rest }) => ({
          ...rest,
          acceptUrl: teamAcceptUrl(token),
        })),
      },
      "Invites loaded",
    );
  } catch (error) {
    return toActionError(error, { fallback: "Failed to load invites." });
  }
};

/**
 * Lists ALL invites for the workspace (newest first) with a computed
 * status so owners can see when an invite was accepted.
 */
export const listTeamInvites = async (): Promise<
  ActionResponseType<TeamInviteListResult>
> => {
  const guard = await requireWorkspaceAdmin();
  if (!guard.ok) return guard.error;

  try {
    const now = new Date();
    const invitations = await db.teamInvitation.findMany({
      where: { workspaceId: guard.value.workspace.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return ActionResponse.success(
      {
        items: invitations.map(({ token, ...rest }) => ({
          ...rest,
          acceptUrl: teamAcceptUrl(token),
          status:
            rest.acceptedAt != null
              ? "ACCEPTED"
              : rest.expiresAt <= now
                ? "EXPIRED"
                : "PENDING",
        })),
      },
      "Invites loaded",
    );
  } catch (error) {
    return toActionError(error, { fallback: "Failed to load invites." });
  }
};

/** Revokes a pending invite — the link stops working immediately. */
export const revokeTeamInvite = async (
  data: TeamInviteIdInput,
): Promise<ActionResponseType<{ revoked: boolean }>> => {
  const validated = teamInviteIdSchema.safeParse(data);
  if (!validated.success) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid input",
      validated.error.flatten().fieldErrors,
    );
  }

  const guard = await requireWorkspaceAdmin();
  if (!guard.ok) return guard.error;

  try {
    await db.teamInvitation.deleteMany({
      where: {
        id: validated.data.id,
        workspaceId: guard.value.workspace.id,
      },
    });
    revalidateDashboard();
    return ActionResponse.success({ revoked: true }, "Invite revoked");
  } catch (error) {
    return toActionError(error, { fallback: "Failed to revoke the invite." });
  }
};

/**
 * Lists everyone with access to the active workspace:
 * the owner first, then admins and members.
 */
export const listTeamMembers = async (): Promise<
  ActionResponseType<TeamMemberListResult>
> => {
  const guard = await requireWorkspace();
  if (!guard.ok) return guard.error;

  try {
    const workspaceId = guard.value.workspace.id;

    const owner = await db.user.findUnique({
      where: { id: guard.value.workspace.ownerId },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    const members = await db.workspaceMember.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    const items: TeamMember[] = [];
    if (owner) {
      items.push({
        userId: owner.id,
        name: owner.name,
        email: owner.email,
        role: "OWNER",
        createdAt: owner.createdAt,
      });
    }
    for (const m of members) {
      items.push({
        userId: m.userId,
        name: m.user.name,
        email: m.user.email,
        role: m.role === "ADMIN" ? "ADMIN" : "MEMBER",
        createdAt: m.createdAt,
      });
    }

    return ActionResponse.success({ items }, "Team members loaded");
  } catch (error) {
    return toActionError(error, { fallback: "Failed to load team members." });
  }
};

/** Promotes/demotes between ADMIN and MEMBER. Owner's standing is fixed. */
export const updateTeamMemberRole = async (
  data: UpdateTeamMemberRoleInput,
): Promise<ActionResponseType<{ updated: boolean }>> => {
  const validated = updateTeamMemberRoleSchema.safeParse(data);
  if (!validated.success) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid input",
      validated.error.flatten().fieldErrors,
    );
  }

  const guard = await requireWorkspaceAdmin();
  if (!guard.ok) return guard.error;

  const { userId, role } = validated.data;

  if (userId === guard.value.workspace.ownerId) {
    return ActionResponse.failure(
      ERROR_CODES.FORBIDDEN,
      "The workspace owner's role cannot be changed.",
    );
  }
  if (userId === guard.value.user.id && role === "MEMBER") {
    return ActionResponse.failure(
      ERROR_CODES.FORBIDDEN,
      "You cannot demote yourself.",
    );
  }

  try {
    await db.workspaceMember.updateMany({
      where: { workspaceId: guard.value.workspace.id, userId },
      data: { role },
    });
    revalidateDashboard();
    return ActionResponse.success({ updated: true }, "Role updated");
  } catch (error) {
    return toActionError(error, { fallback: "Failed to update the role." });
  }
};

/** Removes a teammate and all their project assignments in this workspace. */
export const removeTeamMember = async (
  data: TeamMemberIdInput,
): Promise<ActionResponseType<{ removed: boolean }>> => {
  const validated = teamMemberIdSchema.safeParse(data);
  if (!validated.success) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid input",
      validated.error.flatten().fieldErrors,
    );
  }

  const guard = await requireWorkspaceAdmin();
  if (!guard.ok) return guard.error;

  const { userId } = validated.data;
  const workspaceId = guard.value.workspace.id;

  if (userId === guard.value.workspace.ownerId) {
    return ActionResponse.failure(
      ERROR_CODES.FORBIDDEN,
      "The workspace owner cannot be removed.",
    );
  }
  if (userId === guard.value.user.id) {
    return ActionResponse.failure(
      ERROR_CODES.FORBIDDEN,
      "You cannot remove yourself. Ask another admin or the owner.",
    );
  }

  try {
    await db.$transaction([
      db.projectMember.deleteMany({
        where: { userId, project: { workspaceId } },
      }),
      db.workspaceMember.deleteMany({ where: { workspaceId, userId } }),
    ]);

    // If the removed member was viewing this workspace, reset their context
    await db.user
      .updateMany({
        where: { id: userId, activeWorkspaceId: workspaceId },
        data: { activeWorkspaceId: null },
      })
      .catch(() => {});

    revalidateDashboard();
    return ActionResponse.success({ removed: true }, "Member removed");
  } catch (error) {
    return toActionError(error, { fallback: "Failed to remove the member." });
  }
};

// ──────────────────────────────────────────────
// Server Actions — per-project assignments
// ──────────────────────────────────────────────

/**
 * Lists a project's assigned members (for the project team picker).
 * Requires at least view access to the project.
 */
export const listProjectMembers = async (
  data: ListProjectMembersInput,
): Promise<ActionResponseType<ProjectMemberListResult>> => {
  const validated = listProjectMembersSchema.safeParse(data);
  if (!validated.success) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid input",
      validated.error.flatten().fieldErrors,
    );
  }

  const access = await resolveProjectAccess(validated.data.projectId);
  if (!access.ok) return access.error;

  try {
    const rows = await db.projectMember.findMany({
      where: { projectId: access.value.projectId },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    const items: ProjectMemberInfo[] = rows.map((r) => ({
      userId: r.userId,
      name: r.user.name,
      email: r.user.email,
      role: r.role,
    }));

    return ActionResponse.success({ items }, "Project members loaded");
  } catch (error) {
    return toActionError(error, {
      fallback: "Failed to load project members.",
    });
  }
};

/**
 * Assigns a workspace member to a project with a role, or updates their
 * existing role. Admins can do this anywhere; leads within their projects.
 * Assignments are limited to actual workspace members.
 */
export const updateProjectMemberRole = async (
  data: UpdateProjectMemberRoleInput,
): Promise<ActionResponseType<{ updated: boolean }>> => {
  const validated = updateProjectMemberRoleSchema.safeParse(data);
  if (!validated.success) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid input",
      validated.error.flatten().fieldErrors,
    );
  }

  const access = await resolveProjectAccess(validated.data.projectId);
  if (!access.ok) return access.error;

  const allowed =
    access.value.role === "OWNER" ||
    access.value.role === "ADMIN" ||
    access.value.role === "LEAD";
  if (!allowed) {
    return ActionResponse.failure(
      ERROR_CODES.FORBIDDEN,
      "Only the owner, an admin, or the project lead can manage access.",
    );
  }

  const { projectId, userId, role } = validated.data;

  try {
    // Target must be part of the workspace (owner counts too)
    const ws = await db.project.findUnique({
      where: { id: projectId },
      select: {
        workspaceId: true,
        workspace: { select: { ownerId: true } },
      },
    });
    if (!ws) {
      return ActionResponse.failure(ERROR_CODES.NOT_FOUND, "Project not found.");
    }

    const isWorkspaceMember =
      ws.workspace.ownerId === userId ||
      (await db.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: ws.workspaceId, userId } },
      })) !== null;

    if (!isWorkspaceMember) {
      return ActionResponse.failure(
        ERROR_CODES.VALIDATION_ERROR,
        "That user is not a member of this workspace. Invite them first.",
      );
    }

    await db.projectMember.upsert({
      where: { projectId_userId: { projectId, userId } },
      create: { projectId, userId, role },
      update: { role },
    });

    revalidateDashboard();
    return ActionResponse.success({ updated: true }, "Assignment updated");
  } catch (error) {
    return toActionError(error, { fallback: "Failed to update assignment." });
  }
};

/** Revokes a user's access to a specific project. */
export const removeProjectMember = async (
  data: RemoveProjectMemberInput,
): Promise<ActionResponseType<{ removed: boolean }>> => {
  const validated = removeProjectMemberSchema.safeParse(data);
  if (!validated.success) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid input",
      validated.error.flatten().fieldErrors,
    );
  }

  const access = await resolveProjectAccess(validated.data.projectId);
  if (!access.ok) return access.error;

  const allowed =
    access.value.role === "OWNER" ||
    access.value.role === "ADMIN" ||
    access.value.role === "LEAD";
  if (!allowed) {
    return ActionResponse.failure(
      ERROR_CODES.FORBIDDEN,
      "Only the owner, an admin, or the project lead can manage access.",
    );
  }

  try {
    await db.projectMember.deleteMany({
      where: {
        projectId: validated.data.projectId,
        userId: validated.data.userId,
      },
    });
    revalidateDashboard();
    return ActionResponse.success({ removed: true }, "Access removed");
  } catch (error) {
    return toActionError(error, { fallback: "Failed to remove access." });
  }
};

// ──────────────────────────────────────────────
// Server Actions — accepting an invite (public)
// ──────────────────────────────────────────────

type AcceptInviteState =
  | { status: "VALID"; email: string; workspaceName: string; projectNameCount: number }
  | { status: "INVALID"; reason: string };

/**
 * Validates an invite token for the accept page (public — no auth needed).
 */
export const validateTeamInvite = async (
  token: string,
): Promise<AcceptInviteState> => {
  const trimmed = token?.trim();
  if (!trimmed || trimmed.length > 128) {
    return { status: "INVALID", reason: "This invite link is malformed." };
  }

  const invitation = await db.teamInvitation.findUnique({
    where: { token: trimmed },
    include: { workspace: { select: { name: true } } },
  });

  if (!invitation) {
    return { status: "INVALID", reason: "This invite link is invalid." };
  }
  if (invitation.acceptedAt) {
    return {
      status: "INVALID",
      reason: "This invite has already been used.",
    };
  }
  if (invitation.expiresAt <= new Date()) {
    return { status: "INVALID", reason: "This invite has expired." };
  }

  const projectIds = Array.isArray(invitation.projectIds)
    ? (invitation.projectIds as string[])
    : [];

  return {
    status: "VALID",
    email: invitation.email,
    workspaceName: invitation.workspace.name,
    projectNameCount: projectIds.length,
  };
};

/**
 * Accepts a team invite.
 * - Already signed in with the invited email → memberships granted directly.
 * - Signed in with a different account → rejected.
 * - Signed out → creates the account (name + password), then grants access.
 */
export const acceptTeamInvite = async (
  data: AcceptTeamInviteInput,
): Promise<
  | { success: true; message: string; data: { workspaceId: string } }
  | {
      success: false;
      message: string;
      error: { code: string; fieldErrors?: Record<string, string[]> };
    }
> => {
  const validated = acceptTeamInviteSchema.safeParse(data);
  if (!validated.success) {
    return {
      success: false,
      message: "Invalid input",
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        fieldErrors: validated.error.flatten().fieldErrors as Record<
          string,
          string[]
        >,
      },
    };
  }

  const { token } = validated.data;

  const invitation = await db.teamInvitation.findUnique({
    where: { token },
    include: { workspace: { select: { id: true, name: true } } },
  });

  const invalid = (message: string) => ({
    success: false as const,
    message,
    error: { code: ERROR_CODES.NOT_FOUND },
  });

  if (!invitation) return invalid("This invite link is invalid.");
  if (invitation.acceptedAt) {
    return invalid("This invite has already been used.");
  }
  if (invitation.expiresAt <= new Date()) {
    return invalid("This invite has expired.");
  }

  // Who is accepting?
  let userId: string;
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (session?.user) {
      if (session.user.email.toLowerCase() !== invitation.email.toLowerCase()) {
        return {
          success: false,
          message: `This invite is for ${invitation.email}. Sign in with that account to accept it.`,
          error: { code: ERROR_CODES.FORBIDDEN },
        };
      }
      userId = session.user.id;
    } else {
      // No session. If this email already belongs to a Handoff account,
      // NEVER create a second password for it — direct them to sign in.
      const existingUser = await db.user.findUnique({
        where: { email: invitation.email },
        select: { id: true },
      });
      if (existingUser) {
        return {
          success: false,
          message:
            "This email already has a Handoff account. Sign in with your existing password, then open the invite link again to join.",
          error: { code: "ACCOUNT_EXISTS" },
        };
      }

      // Create the account — this invite IS the sign-up flow
      if (!validated.data.name || !validated.data.password) {
        return {
          success: false,
          message: "Name and password are required to join.",
          error: {
            code: ERROR_CODES.VALIDATION_ERROR,
            fieldErrors: {
              ...(validated.data.name ? {} : { name: ["Name is required"] }),
              ...(validated.data.password
                ? {}
                : { password: ["Password is required"] }),
            },
          },
        };
      }

      const result = await auth.api.signUpEmail({
        body: {
          name: validated.data.name,
          email: invitation.email,
          password: validated.data.password,
        },
        headers: await headers(),
      });
      if (!result.user) {
        return {
          success: false,
          message: "Failed to create your account.",
          error: { code: "INTERNAL_ERROR" as string },
        };
      }
      userId = result.user.id;
    }
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes("already registered")
        ? "An account with this email already exists. Sign in to accept the invite."
        : "Couldn't accept the invite. Please try again.";
    console.error("acceptTeamInvite error:", error);
    return { success: false, message, error: { code: "INTERNAL_ERROR" } };
  }

  try {
    const projectIds = Array.isArray(invitation.projectIds)
      ? (invitation.projectIds as string[])
      : [];

    await grantInvitedAccess(invitation.workspace.id, userId, projectIds);
    await db.teamInvitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });

    revalidateDashboard();
    return {
      success: true,
      message: `Welcome to ${invitation.workspace.name}!`,
      data: { workspaceId: invitation.workspace.id },
    };
  } catch (error) {
    return toActionError(error, {
      fallback: "Couldn't finish setting up your membership.",
    }) as never;
  }
};
