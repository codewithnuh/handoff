"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { ClientInvitation } from "@/app/generated/prisma/client";
import { db } from "@/lib/prisma";
import { env } from "@/env";
import { actorOf, recordActivity } from "@/lib/actions/activity";
import { can, defineAction } from "@/lib/actions/define";
import { resolveProjectAccess } from "@/lib/access";
import { ERROR_CODES } from "@/lib/constants/errors";
import type { ActionResponseType } from "@/lib/types/action";
import { ActionResponse } from "@/lib/utils/action-response";
import {
  inviteClientSchema,
  revokeAccessSchema,
} from "@/lib/validation/invitation";

// ──────────────────────────────────────────────
// Result types
// ──────────────────────────────────────────────

export type ClientInvitationResult = ClientInvitation & {
  /** Portal accept URL — the freelancer shares this manually */
  acceptUrl: string;
};
export type RevokeAccessResult = { revoked: boolean; email: string; projectId: string };
export type ResendInvitationResult = ClientInvitationResult;

import { INVITE_TTL_MS } from "@/lib/constants/invitations";

const revalidatePortalPages = () => {
  revalidatePath("/dashboard/portal");
};

/**
 * Creates an invitation token for the given email + project.
 * Any previous unaccepted invitations for the same email + project are
 * invalidated so exactly one live link exists at a time.
 */
async function createInvitation(projectId: string, email: string) {
  // Invalidate-then-create is one unit: a half-applied run would leave
  // either two live links or none.
  return db.$transaction(async (tx) => {
    await tx.clientInvitation.updateMany({
      where: {
        projectId,
        email,
        acceptedAt: null,
      },
      data: {
        // Set expiry to now so old tokens are immediately invalid
        expiresAt: new Date(),
      },
    });

    return tx.clientInvitation.create({
      data: {
        projectId,
        email,
        token: randomBytes(32).toString("hex"),
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      },
    });
  });
}

// ──────────────────────────────────────────────
// Server Actions
// ──────────────────────────────────────────────

export const inviteClient = defineAction({
  schema: inviteClientSchema,
  guard: (input) => resolveProjectAccess(input.projectId),
  // Client-facing actions are lead-level (quality gate): inviting,
  // re-inviting, and revoking portal access push work to the client.
  check: can(
    "canSubmitForReview",
    "Only a project lead can manage client access.",
  ),
  errors: { fallback: "Failed to create invitation." },
  run: async (input, ctx): Promise<ActionResponseType<ClientInvitationResult>> => {
    const invitation = await createInvitation(input.projectId, input.email);

    await recordActivity({
      projectId: input.projectId,
      type: "CLIENT_INVITED",
      ...actorOf(ctx.user),
      meta: { email: invitation.email },
    });

    // The accept endpoint lives under /api — the old /portal/accept path 404'd
    const acceptUrl = `${env.NEXT_PUBLIC_APP_URL}/api/portal/accept?token=${invitation.token}`;

    revalidatePortalPages();
    return ActionResponse.success(
      { ...invitation, acceptUrl },
      "Invitation link generated. Copy and share it with your client.",
    );
  },
});

// ──────────────────────────────────────────────
// Revoke client access
// ──────────────────────────────────────────────

/**
 * Revoke a client's access to a specific project.
 * Deletes the ProjectAccess row AND all ClientSessions for that email,
 * so the client immediately loses portal access on next request.
 */
export const revokeClientAccess = defineAction({
  schema: revokeAccessSchema,
  guard: (input) => resolveProjectAccess(input.projectId),
  // Client-facing actions are lead-level (quality gate): inviting,
  // re-inviting, and revoking portal access push work to the client.
  check: can(
    "canSubmitForReview",
    "Only a project lead can manage client access.",
  ),
  errors: { fallback: "Failed to revoke client access." },
  run: async (input): Promise<ActionResponseType<RevokeAccessResult>> => {
    // 1. Delete ProjectAccess
    const result = await db.projectAccess.deleteMany({
      where: {
        projectId: input.projectId,
        email: input.email,
      },
    });

    if (result.count === 0) {
      return ActionResponse.failure(
        ERROR_CODES.NOT_FOUND,
        "No access record found for this client on this project.",
      );
    }

    // 2. Immediately revoke all active sessions for this email
    await db.clientSession.deleteMany({
      where: { email: input.email },
    });

    revalidatePortalPages();
    return ActionResponse.success(
      {
        revoked: true,
        email: input.email,
        projectId: input.projectId,
      },
      "Client access revoked successfully",
    );
  },
});

// ──────────────────────────────────────────────
// Re-invite client
// ──────────────────────────────────────────────

/**
 * Generate a fresh invitation link for a client.
 * Invalidates any previous unaccepted invitations for this email+project.
 * No email is sent — the freelancer copies and shares the link manually.
 */
export const resendInvitation = defineAction({
  schema: inviteClientSchema,
  guard: (input) => resolveProjectAccess(input.projectId),
  // Client-facing actions are lead-level (quality gate): inviting,
  // re-inviting, and revoking portal access push work to the client.
  check: can(
    "canSubmitForReview",
    "Only a project lead can manage client access.",
  ),
  errors: { fallback: "Failed to generate new invitation." },
  run: async (input): Promise<ActionResponseType<ResendInvitationResult>> => {
    // Invalidate old links + create a fresh invitation
    const invitation = await createInvitation(input.projectId, input.email);

    const acceptUrl = `${env.NEXT_PUBLIC_APP_URL}/api/portal/accept?token=${invitation.token}`;

    revalidatePortalPages();
    return ActionResponse.success(
      { ...invitation, acceptUrl },
      "New invitation link generated. Copy and share it with your client.",
    );
  },
});
