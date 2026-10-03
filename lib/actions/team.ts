"use server";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import type {
  TeamInvitation,
  WorkspacePermission,
} from "@/app/generated/prisma/client";
import type { Prisma } from "@/app/generated/prisma/client";
import { db } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { env } from "@/env";
import { teamInviteEmailHtml, sendEmail } from "@/lib/email";
import { defineAction } from "@/lib/actions/define";
import {
  requireWorkspacePermission,
  resolveProjectAccess,
} from "@/lib/access";
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
  updateMemberPermissionsSchema,
  updateProjectMemberRoleSchema,
  updateTeamMemberRoleSchema,
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
  /** Granular permissions (empty for owners who have implicit full access) */
  permissions: WorkspacePermission[];
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

import { INVITE_TTL_MS } from "@/lib/constants/invitations";

/** Builds the public accept URL for an invitation token. */
const teamAcceptUrl = (token: string) =>
  `${env.NEXT_PUBLIC_APP_URL}/invite/team/${token}`;

// ──────────────────────────────────────────────
// Internal helpers
// ──────────────────────────────────────────────

/**
 * Creates the membership rows for an accepted invitation:
 * WorkspaceMember (with role + permissions from the invite) + one ProjectMember
 * (CONTRIBUTOR) per assigned project. Idempotent via unique-constraint upserts.
 */
async function grantInvitedAccess(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  userId: string,
  projectIds: string[],
  role: "ADMIN" | "MEMBER" = "MEMBER",
  permissions: string[] = [],
) {
  await tx.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId, userId } },
    create: {
      workspaceId,
      userId,
      role,
      permissions: permissions as WorkspacePermission[],
    },
    update: {
      role,
      permissions: permissions as WorkspacePermission[],
    },
  });

  // Only assign projects that actually belong to this workspace
  const validProjects = await tx.project.findMany({
    where: { id: { in: projectIds }, workspaceId },
    select: { id: true },
  });

  for (const project of validProjects) {
    await tx.projectMember.upsert({
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
    tx.workspace.count({ where: { ownerId: userId } }),
    tx.workspaceMember.count({ where: { userId } }),
  ]);
  const isBrandNew = ownedCount + membershipCount <= 1; // just this one
  if (isBrandNew) {
    await tx.user
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
export const inviteTeammate = defineAction({
  schema: inviteTeammateSchema,
  guard: () => requireWorkspacePermission("MANAGE_MEMBERS"),
  revalidate: true,
  errors: { fallback: "Failed to create the invite." },
  run: async (
    input,
    ctx,
  ): Promise<ActionResponseType<TeammateInviteResult>> => {
    const workspaceId = ctx.workspace.id;
    const email = input.email.toLowerCase();

    // ── Account boundary guards ──
    // Don't invite someone who's already on the team.
    const owner = await db.user.findUnique({
      where: { id: ctx.workspace.ownerId },
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
        id: { in: input.projectIds ?? [] },
        workspaceId,
      },
      select: { id: true },
    });

    const invitation = await db.teamInvitation.create({
      data: {
        workspaceId,
        email,
        token: randomBytes(32).toString("hex"),
        invitedByEmail: ctx.user.email,
        projectIds: validProjects.map((p) => p.id),
        role: input.role,
        permissions: input.permissions,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      },
    });

    // Deliver the invite by email. The link also stays copyable in the UI
    // as a fallback, so a transport failure must not fail the invite.
    await sendEmail({
      to: email,
      subject: `You've been invited to ${ctx.workspace.name} on Handoff`,
      text:
        `${ctx.user.name} invited you to collaborate in ` +
        `"${ctx.workspace.name}". Accept here: ${teamAcceptUrl(invitation.token)}`,
      html: teamInviteEmailHtml(
        ctx.user.name,
        ctx.workspace.name,
        teamAcceptUrl(invitation.token),
      ),
    }).catch((err) => {
      console.error("Failed to send team invite email:", err);
    });

    return ActionResponse.success(
      { ...invitation, acceptUrl: teamAcceptUrl(invitation.token) },
      existingUser
        ? "Invite link generated. They already use Handoff, so they'll sign in with their existing password to accept it."
        : "Invite link generated. Copy and share it with your teammate.",
    );
  },
});

/** Lists pending (unaccepted, unexpired) teammate invites with accept URLs. */
export const listPendingTeamInvites = defineAction({
  guard: () => requireWorkspacePermission("MANAGE_MEMBERS"),
  errors: { fallback: "Failed to load invites." },
  run: async (ctx): Promise<ActionResponseType<PendingTeamInviteListResult>> => {
    const invitations = await db.teamInvitation.findMany({
      where: {
        workspaceId: ctx.workspace.id,
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
  },
});

/**
 * Lists ALL invites for the workspace (newest first) with a computed
 * status so owners can see when an invite was accepted.
 */
export const listTeamInvites = defineAction({
  guard: () => requireWorkspacePermission("MANAGE_MEMBERS"),
  errors: { fallback: "Failed to load invites." },
  run: async (ctx): Promise<ActionResponseType<TeamInviteListResult>> => {
    const now = new Date();
    const invitations = await db.teamInvitation.findMany({
      where: { workspaceId: ctx.workspace.id },
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
  },
});

/** Revokes a pending invite — the link stops working immediately. */
export const revokeTeamInvite = defineAction({
  schema: teamInviteIdSchema,
  guard: () => requireWorkspacePermission("MANAGE_MEMBERS"),
  revalidate: true,
  errors: { fallback: "Failed to revoke the invite." },
  run: async (input, ctx): Promise<ActionResponseType<{ revoked: boolean }>> => {
    await db.teamInvitation.deleteMany({
      where: {
        id: input.id,
        workspaceId: ctx.workspace.id,
      },
    });
    return ActionResponse.success({ revoked: true }, "Invite revoked");
  },
});

/**
 * Lists everyone with access to the active workspace:
 * the owner first, then admins and members.
 */
export const listTeamMembers = defineAction({
  errors: { fallback: "Failed to load team members." },
  run: async (ctx): Promise<ActionResponseType<TeamMemberListResult>> => {
    const workspaceId = ctx.workspace.id;

    const owner = await db.user.findUnique({
      where: { id: ctx.workspace.ownerId },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    const members = await db.workspaceMember.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "asc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const items: TeamMember[] = [];
    if (owner) {
      items.push({
        userId: owner.id,
        name: owner.name,
        email: owner.email,
        role: "OWNER",
        permissions: [],
        createdAt: owner.createdAt,
      });
    }
    for (const m of members) {
      items.push({
        userId: m.userId,
        name: m.user.name,
        email: m.user.email,
        role: m.role === "ADMIN" ? "ADMIN" : "MEMBER",
        permissions: m.permissions,
        createdAt: m.createdAt,
      });
    }

    return ActionResponse.success({ items }, "Team members loaded");
  },
});

/** Promotes/demotes between ADMIN and MEMBER. Owner's standing is fixed. */
export const updateTeamMemberRole = defineAction({
  schema: updateTeamMemberRoleSchema,
  guard: () => requireWorkspacePermission("MANAGE_MEMBERS"),
  check: [
    (ctx, input) =>
      input.userId === ctx.workspace.ownerId
        ? ActionResponse.failure(
            ERROR_CODES.FORBIDDEN,
            "The workspace owner's role cannot be changed.",
          )
        : null,
    (ctx, input) =>
      input.userId === ctx.user.id && input.role === "MEMBER"
        ? ActionResponse.failure(
            ERROR_CODES.FORBIDDEN,
            "You cannot demote yourself.",
          )
        : null,
  ],
  revalidate: true,
  errors: { fallback: "Failed to update the role." },
  run: async (input, ctx): Promise<ActionResponseType<{ updated: boolean }>> => {
    await db.workspaceMember.updateMany({
      where: { workspaceId: ctx.workspace.id, userId: input.userId },
      data: { role: input.role },
    });
    return ActionResponse.success({ updated: true }, "Role updated");
  },
});

/**
 * Updates the granular workspace permissions for a member.
 * Owners always have full access — permissions are only meaningful for non-owner members.
 * Only admins or users with MANAGE_MEMBERS permission can change permissions.
 */
export const updateMemberPermissions = defineAction({
  schema: updateMemberPermissionsSchema,
  guard: () => requireWorkspacePermission("MANAGE_MEMBERS"),
  check: (ctx, input) =>
    input.userId === ctx.workspace.ownerId
      ? ActionResponse.failure(
          ERROR_CODES.FORBIDDEN,
          "The workspace owner always has full access. Permissions cannot be modified.",
        )
      : null,
  revalidate: true,
  errors: { fallback: "Failed to update permissions." },
  run: async (input, ctx): Promise<ActionResponseType<{ updated: boolean }>> => {
    await db.workspaceMember.updateMany({
      where: { workspaceId: ctx.workspace.id, userId: input.userId },
      data: { permissions: input.permissions as WorkspacePermission[] },
    });
    return ActionResponse.success({ updated: true }, "Permissions updated");
  },
});

/** Removes a teammate and all their project assignments in this workspace. */
export const removeTeamMember = defineAction({
  schema: teamMemberIdSchema,
  guard: () => requireWorkspacePermission("MANAGE_MEMBERS"),
  check: [
    (ctx, input) =>
      input.userId === ctx.workspace.ownerId
        ? ActionResponse.failure(
            ERROR_CODES.FORBIDDEN,
            "The workspace owner cannot be removed.",
          )
        : null,
    (ctx, input) =>
      input.userId === ctx.user.id
        ? ActionResponse.failure(
            ERROR_CODES.FORBIDDEN,
            "You cannot remove yourself. Ask another admin or the owner.",
          )
        : null,
  ],
  revalidate: true,
  errors: { fallback: "Failed to remove the member." },
  run: async (input, ctx): Promise<ActionResponseType<{ removed: boolean }>> => {
    const { userId } = input;
    const workspaceId = ctx.workspace.id;

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

    return ActionResponse.success({ removed: true }, "Member removed");
  },
});

// ──────────────────────────────────────────────
// Server Actions — per-project assignments
// ──────────────────────────────────────────────

/**
 * Lists a project's assigned members (for the project team picker).
 * Requires at least view access to the project.
 */
export const listProjectMembers = defineAction({
  schema: listProjectMembersSchema,
  guard: (input) => resolveProjectAccess(input.projectId),
  errors: { fallback: "Failed to load project members." },
  run: async (
    input,
    ctx,
  ): Promise<ActionResponseType<ProjectMemberListResult>> => {
    const rows = await db.projectMember.findMany({
      where: { projectId: ctx.projectId },
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
  },
});

/**
 * Assigns a workspace member to a project with a role, or updates their
 * existing role. Admins can do this anywhere; leads within their projects.
 * Assignments are limited to actual workspace members.
 */
export const updateProjectMemberRole = defineAction({
  schema: updateProjectMemberRoleSchema,
  guard: (input) => resolveProjectAccess(input.projectId),
  check: (ctx) =>
    ctx.role === "OWNER" || ctx.role === "ADMIN" || ctx.role === "LEAD"
      ? null
      : ActionResponse.failure(
          ERROR_CODES.FORBIDDEN,
          "Only the owner, an admin, or the project lead can manage access.",
        ),
  revalidate: true,
  errors: { fallback: "Failed to update assignment." },
  run: async (input): Promise<ActionResponseType<{ updated: boolean }>> => {
    const { projectId, userId, role } = input;

    // Target must be part of the workspace (owner counts too)
    const ws = await db.project.findUnique({
      where: { id: projectId },
      select: {
        workspaceId: true,
        workspace: { select: { ownerId: true } },
      },
    });
    if (!ws) {
      return ActionResponse.failure(
        ERROR_CODES.NOT_FOUND,
        "Project not found.",
      );
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

    return ActionResponse.success({ updated: true }, "Assignment updated");
  },
});

/** Revokes a user's access to a specific project. */
export const removeProjectMember = defineAction({
  schema: removeProjectMemberSchema,
  guard: (input) => resolveProjectAccess(input.projectId),
  check: (ctx) =>
    ctx.role === "OWNER" || ctx.role === "ADMIN" || ctx.role === "LEAD"
      ? null
      : ActionResponse.failure(
          ERROR_CODES.FORBIDDEN,
          "Only the owner, an admin, or the project lead can manage access.",
        ),
  revalidate: true,
  errors: { fallback: "Failed to remove access." },
  run: async (input): Promise<ActionResponseType<{ removed: boolean }>> => {
    await db.projectMember.deleteMany({
      where: {
        projectId: input.projectId,
        userId: input.userId,
      },
    });
    return ActionResponse.success({ removed: true }, "Access removed");
  },
});

// ──────────────────────────────────────────────
// Server Actions — accepting an invite (public)
// ──────────────────────────────────────────────

type AcceptInviteState =
  | {
      status: "VALID";
      email: string;
      workspaceName: string;
      projectNameCount: number;
    }
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
export const acceptTeamInvite = defineAction({
  schema: acceptTeamInviteSchema,
  guard: null,
  revalidate: true,
  errors: { fallback: "Couldn't finish setting up your membership." },
  run: async (
    input,
  ): Promise<ActionResponseType<{ workspaceId: string }>> => {
    const { token } = input;

    const invitation = await db.teamInvitation.findUnique({
      where: { token },
      include: { workspace: { select: { id: true, name: true } } },
    });

    const invalid = (message: string) =>
      ActionResponse.failure(ERROR_CODES.NOT_FOUND, message);

    if (!invitation) return invalid("This invite link is invalid.");
    if (invitation.acceptedAt) {
      return invalid("This invite has already been used.");
    }
    if (invitation.expiresAt <= new Date()) {
      return invalid("This invite has expired.");
    }

    // Who is accepting? Existing accounts must sign in with the verified
    // address the invitation was sent to. A new account can be created from
    // this one-time emailed token, which itself proves mailbox possession.
    let userId: string;
    let verifiedByInviteToken = false;
    try {
      const session = await auth.api.getSession({ headers: await headers() });

      if (session?.user) {
        if (session.user.email.toLowerCase() !== invitation.email.toLowerCase()) {
          return ActionResponse.failure(
            ERROR_CODES.FORBIDDEN,
            `This invite is for ${invitation.email}. Sign in with that account to accept it.`,
          );
        }
        if (!session.user.emailVerified) {
          return ActionResponse.failure(
            ERROR_CODES.FORBIDDEN,
            "Verify your email address before accepting this invite.",
          );
        }
        userId = session.user.id;
      } else {
        // No session. If this email already belongs to a Handoff account,
        // NEVER create a second password for it — direct them to sign in.
        const existingUser = await db.user.findFirst({
          where: { email: { equals: invitation.email, mode: "insensitive" } },
          select: { id: true },
        });
        if (existingUser) {
          return ActionResponse.failure(
            ERROR_CODES.ACCOUNT_EXISTS,
            "This email already has a Handoff account. Sign in with your existing password, then open the invite link again to join.",
          );
        }

        // Create the account — this invite IS the sign-up flow
        if (!input.name || !input.password) {
          return ActionResponse.failure(
            ERROR_CODES.VALIDATION_ERROR,
            "Name and password are required to join.",
            {
              ...(input.name ? {} : { name: ["Name is required"] }),
              ...(input.password
                ? {}
                : { password: ["Password is required"] }),
            },
          );
        }

        const result = await auth.api.signUpEmail({
          body: {
            name: input.name,
            email: invitation.email,
            password: input.password,
          },
          headers: await headers(),
        });
        if (!result.user) {
          return ActionResponse.failure(
            ERROR_CODES.INTERNAL_ERROR,
            "Failed to create your account.",
          );
        }
        userId = result.user.id;
        verifiedByInviteToken = true;
      }
    } catch (error) {
      const message =
        error instanceof Error && error.message.includes("already registered")
          ? "An account with this email already exists. Sign in to accept the invite."
          : "Couldn't accept the invite. Please try again.";
      console.error("acceptTeamInvite error:", error);
      return ActionResponse.failure(ERROR_CODES.INTERNAL_ERROR, message);
    }

    const projectIds = Array.isArray(invitation.projectIds)
      ? (invitation.projectIds as string[])
      : [];
    const inviteRole = invitation.role === "ADMIN" ? "ADMIN" : "MEMBER";
    const invitePermissions = Array.isArray(invitation.permissions)
      ? (invitation.permissions as string[])
      : [];

    const accepted = await db.$transaction(async (tx) => {
      const workspaceOwner = await tx.workspace.findUnique({
        where: { id: invitation.workspace.id },
        select: { ownerId: true },
      });
      if (!workspaceOwner || workspaceOwner.ownerId === userId) return false;

      const now = new Date();
      const claim = await tx.teamInvitation.updateMany({
        where: {
          id: invitation.id,
          acceptedAt: null,
          expiresAt: { gt: now },
        },
        data: { acceptedAt: now },
      });
      if (claim.count !== 1) return false;

      if (verifiedByInviteToken) {
        await tx.user.update({
          where: { id: userId },
          data: { emailVerified: true },
        });
      }

      await grantInvitedAccess(
        tx,
        invitation.workspace.id,
        userId,
        projectIds,
        inviteRole,
        invitePermissions,
      );
      return true;
    });

    if (!accepted) {
      return invalid("This invite has already been used or has expired.");
    }

    return ActionResponse.success(
      { workspaceId: invitation.workspace.id },
      `Welcome to ${invitation.workspace.name}!`,
    );
  },
});
