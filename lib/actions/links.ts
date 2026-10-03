"use server";

/**
 * Centralised link tracking — lists all team invitation and client
 * portal invitation links for the current workspace, with computed
 * status (active, expired, revoked, accepted).
 */

import { db } from "@/lib/prisma";
import { defineAction } from "@/lib/actions/define";
import { requireWorkspacePermission, requireWorkspaceAdmin } from "@/lib/access";
import { ERROR_CODES } from "@/lib/constants/errors";
import type { ActionResponseType } from "@/lib/types/action";
import { ActionResponse } from "@/lib/utils/action-response";
import {
  revokeLinkSchema,
  bulkRevokeSchema,
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

export const listAllLinks = defineAction({
  guard: () => requireWorkspacePermission("MANAGE_MEMBERS"),
  errors: { fallback: "Failed to load links." },
  run: async (ctx): Promise<ActionResponseType<LinksListResult>> => {
    const workspaceId = ctx.workspace.id;

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
      contextName: ctx.workspace.name,
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
  },
});

// ──────────────────────────────────────────────
// Revoke a single link
// ──────────────────────────────────────────────

export const revokeLink = defineAction({
  schema: revokeLinkSchema,
  guard: requireWorkspaceAdmin,
  revalidate: true,
  errors: { fallback: "Failed to revoke link." },
  run: async (input, ctx): Promise<ActionResponseType<{ revoked: boolean }>> => {
    if (input.type === "team") {
      const deleted = await db.teamInvitation.deleteMany({
        where: {
          id: input.id,
          workspaceId: ctx.workspace.id,
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
      // Revoke only an unconsumed token. If acceptance wins the race, keep
      // its session and access intact.
      const revoked = await db.$transaction(async (tx) => {
        const invite = await tx.clientInvitation.findFirst({
          where: {
            id: input.id,
            acceptedAt: null,
            project: { workspaceId: ctx.workspace.id },
          },
          select: { id: true, email: true },
        });
        if (!invite) return false;

        const deleted = await tx.clientInvitation.deleteMany({
          where: {
            id: invite.id,
            acceptedAt: null,
            project: { workspaceId: ctx.workspace.id },
          },
        });
        if (deleted.count !== 1) return false;

        await tx.clientSession.deleteMany({ where: { email: invite.email } });
        return true;
      });

      if (!revoked) {
        return ActionResponse.failure(
          ERROR_CODES.NOT_FOUND,
          "Pending invitation not found.",
        );
      }
    }

    return ActionResponse.success({ revoked: true }, "Link revoked");
  },
});

// ──────────────────────────────────────────────
// Bulk revoke links
// ──────────────────────────────────────────────

export const bulkRevokeLinks = defineAction({
  schema: bulkRevokeSchema,
  guard: requireWorkspaceAdmin,
  revalidate: true,
  errors: { fallback: "Failed to revoke links." },
  run: async (input, ctx): Promise<ActionResponseType<{ revoked: number }>> => {
    let revoked = 0;

    if (input.type === "team") {
      const result = await db.teamInvitation.deleteMany({
        where: {
          id: { in: input.ids },
          workspaceId: ctx.workspace.id,
          acceptedAt: null,
        },
      });
      revoked = result.count;
    } else {
      revoked = await db.$transaction(async (tx) => {
        const invites = await tx.clientInvitation.findMany({
          where: {
            id: { in: input.ids },
            acceptedAt: null,
            project: { workspaceId: ctx.workspace.id },
          },
          select: { id: true, email: true },
        });

        let removed = 0;
        for (const invite of invites) {
          const deleted = await tx.clientInvitation.deleteMany({
            where: {
              id: invite.id,
              acceptedAt: null,
              project: { workspaceId: ctx.workspace.id },
            },
          });
          if (deleted.count !== 1) continue;

          await tx.clientSession.deleteMany({ where: { email: invite.email } });
          removed += 1;
        }
        return removed;
      });
    }

    return ActionResponse.success(
      { revoked },
      `${revoked} link(s) revoked`,
    );
  },
});
