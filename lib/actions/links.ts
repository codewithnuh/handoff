"use server";

/**
 * Centralised link tracking — lists all team invitation and client
 * portal invitation links for the current workspace, with computed
 * status (active, expired, revoked, accepted).
 */

import { db } from "@/lib/prisma";
import { requireWorkspacePermission, requireWorkspaceAdmin } from "@/lib/actions/guards";
import { revalidateDashboard } from "@/lib/actions/revalidate";
import { toActionError } from "@/lib/actions/helpers";
import { ERROR_CODES } from "@/lib/constants/errors";
import type { ActionResponseType } from "@/lib/types/action";
import { ActionResponse } from "@/lib/utils/action-response";
import {
  revokeLinkSchema,
  bulkRevokeSchema,
} from "@/lib/validation/links";
import type {
  RevokeLinkInput,
  BulkRevokeInput,
} from "@/lib/validation/links";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type LinkStatus = "ACTIVE" | "EXPIRED" | "ACCEPTED" | "REVOKED";

export type TrackedLink = {
  id: string;
  type: "team" | "client";
  email: string;
  /** For team links: the workspace name. For client links: the project name. */
  contextName: string;
  contextId: string;
  token: string;
  acceptUrl: string;
  status: LinkStatus;
  createdAt: Date;
  expiresAt: Date;
  acceptedAt: Date | null;
  invitedBy: string | null;
};

export type LinksListResult = {
  teamLinks: TrackedLink[];
  clientLinks: TrackedLink[];
};

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function computeStatus(
  acceptedAt: Date | null,
  expiresAt: Date,
): LinkStatus {
  if (acceptedAt) return "ACCEPTED";
  if (expiresAt <= new Date()) return "EXPIRED";
  return "ACTIVE";
}

// ──────────────────────────────────────────────
// List all links
// ──────────────────────────────────────────────

export const listAllLinks = async (): Promise<
  ActionResponseType<LinksListResult>
> => {
  const guard = await requireWorkspacePermission("MANAGE_MEMBERS");
  if (!guard.ok) return guard.error;

  try {
    const workspaceId = guard.value.workspace.id;

    // Team invitations for this workspace
    const teamInvites = await db.teamInvitation.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        token: true,
        createdAt: true,
        expiresAt: true,
        acceptedAt: true,
        invitedByEmail: true,
      },
    });

    // Client invitations for projects in this workspace
    const clientInvites = await db.clientInvitation.findMany({
      where: {
        project: { workspaceId },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        token: true,
        createdAt: true,
        expiresAt: true,
        acceptedAt: true,
        project: {
          select: { id: true, name: true },
        },
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

    const teamLinks: TrackedLink[] = teamInvites.map((inv) => ({
      id: inv.id,
      type: "team" as const,
      email: inv.email,
      contextName: guard.value.workspace.name,
      contextId: workspaceId,
      token: inv.token,
      acceptUrl: `${appUrl}/invite/team/${inv.token}`,
      status: computeStatus(inv.acceptedAt, inv.expiresAt),
      createdAt: inv.createdAt,
      expiresAt: inv.expiresAt,
      acceptedAt: inv.acceptedAt,
      invitedBy: inv.invitedByEmail,
    }));

    const clientLinks: TrackedLink[] = clientInvites.map((inv) => ({
      id: inv.id,
      type: "client" as const,
      email: inv.email,
      contextName: inv.project.name,
      contextId: inv.project.id,
      token: inv.token,
      acceptUrl: `${appUrl}/api/portal/accept?token=${inv.token}`,
      status: computeStatus(inv.acceptedAt, inv.expiresAt),
      createdAt: inv.createdAt,
      expiresAt: inv.expiresAt,
      acceptedAt: inv.acceptedAt,
      invitedBy: null,
    }));

    return ActionResponse.success(
      { teamLinks, clientLinks },
      "Links loaded",
    );
  } catch (error) {
    return toActionError(error, { fallback: "Failed to load links." });
  }
};

// ──────────────────────────────────────────────
// Revoke a single link
// ──────────────────────────────────────────────

export const revokeLink = async (
  data: RevokeLinkInput,
): Promise<ActionResponseType<{ revoked: boolean }>> => {
  const validated = revokeLinkSchema.safeParse(data);
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
    if (validated.data.type === "team") {
      const deleted = await db.teamInvitation.deleteMany({
        where: {
          id: validated.data.id,
          workspaceId: guard.value.workspace.id,
          acceptedAt: null, // Only revoke pending invites
        },
      });
      if (deleted.count === 0) {
        return ActionResponse.failure(
          ERROR_CODES.NOT_FOUND,
          "Invite not found or already accepted.",
        );
      }
    } else {
      // Client link — delete the invitation
      const invite = await db.clientInvitation.findUnique({
        where: { id: validated.data.id },
        select: {
          id: true,
          email: true,
          project: { select: { workspaceId: true } },
        },
      });

      if (!invite || invite.project.workspaceId !== guard.value.workspace.id) {
        return ActionResponse.failure(
          ERROR_CODES.NOT_FOUND,
          "Invitation not found.",
        );
      }

      // Delete the invitation and revoke any active sessions for this email
      await db.$transaction([
        db.clientInvitation.delete({ where: { id: invite.id } }),
        db.clientSession.deleteMany({ where: { email: invite.email } }),
      ]);
    }

    revalidateDashboard();
    return ActionResponse.success({ revoked: true }, "Link revoked");
  } catch (error) {
    return toActionError(error, { fallback: "Failed to revoke link." });
  }
};

// ──────────────────────────────────────────────
// Bulk revoke links
// ──────────────────────────────────────────────

export const bulkRevokeLinks = async (
  data: BulkRevokeInput,
): Promise<ActionResponseType<{ revoked: number }>> => {
  const validated = bulkRevokeSchema.safeParse(data);
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
    let revoked = 0;

    if (validated.data.type === "team") {
      const result = await db.teamInvitation.deleteMany({
        where: {
          id: { in: validated.data.ids },
          workspaceId: guard.value.workspace.id,
          acceptedAt: null,
        },
      });
      revoked = result.count;
    } else {
      // Client links — find invitations, delete them, revoke sessions
      const invites = await db.clientInvitation.findMany({
        where: {
          id: { in: validated.data.ids },
          project: { workspaceId: guard.value.workspace.id },
        },
        select: { id: true, email: true },
      });

      if (invites.length > 0) {
        const inviteIds = invites.map((i) => i.id);
        const emails = [...new Set(invites.map((i) => i.email))];

        await db.$transaction([
          db.clientInvitation.deleteMany({ where: { id: { in: inviteIds } } }),
          db.clientSession.deleteMany({ where: { email: { in: emails } } }),
        ]);

        revoked = invites.length;
      }
    }

    revalidateDashboard();
    return ActionResponse.success(
      { revoked },
      `${revoked} link(s) revoked`,
    );
  } catch (error) {
    return toActionError(error, { fallback: "Failed to revoke links." });
  }
};
