"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { ClientInvitation } from "@/app/generated/prisma/client";
import { db } from "@/lib/prisma";
import { env } from "@/env";
import { recordActivity } from "@/lib/actions/activity";
import { toActionError } from "@/lib/actions/helpers";
import { resolveProjectAccess } from "@/lib/actions/guards";
import { ERROR_CODES } from "@/lib/constants/errors";
import type { ActionResponseType } from "@/lib/types/action";
import { ActionResponse } from "@/lib/utils/action-response";
import {
  inviteClientSchema,
  revokeAccessSchema,
} from "@/lib/validation/invitation";
import type {
  InviteClientInput,
  RevokeAccessInput,
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

const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

const revalidatePortalPages = () => {
  revalidatePath("/dashboard/portal");
};

/**
 * Creates an invitation token for the given email + project.
 * Any previous unaccepted invitations for the same email + project are
 * invalidated so exactly one live link exists at a time.
 */
async function createInvitation(projectId: string, email: string) {
  await db.clientInvitation.updateMany({
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

  return db.clientInvitation.create({
    data: {
      projectId,
      email,
      token: randomBytes(32).toString("hex"),
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    },
  });
}

// ──────────────────────────────────────────────
// Server Actions
// ──────────────────────────────────────────────

export const inviteClient = async (
  data: InviteClientInput,
): Promise<ActionResponseType<ClientInvitationResult>> => {
  const validated = inviteClientSchema.safeParse(data);
  if (!validated.success) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid input",
      validated.error.flatten().fieldErrors,
    );
  }

  // Client-facing actions are lead-level (quality gate): inviting,
  // re-inviting, and revoking portal access push work to the client.
  const access = await resolveProjectAccess(validated.data.projectId);
  if (!access.ok) return access.error;

  if (!access.value.canSubmitForReview) {
    return ActionResponse.failure(
      ERROR_CODES.FORBIDDEN,
      "Only a project lead can manage client access.",
    );
  }

  try {
    const invitation = await createInvitation(
      validated.data.projectId,
      validated.data.email,
    );

    await recordActivity({
      projectId: validated.data.projectId,
      type: "CLIENT_INVITED",
      actorUserId: access.value.user.id,
      actorEmail: access.value.user.email,
      actorName: access.value.user.name,
      meta: { email: invitation.email },
    });

    // The accept endpoint lives under /api — the old /portal/accept path 404'd
    const acceptUrl = `${env.NEXT_PUBLIC_APP_URL}/api/portal/accept?token=${invitation.token}`;

    revalidatePortalPages();
    return ActionResponse.success(
      { ...invitation, acceptUrl },
      "Invitation link generated. Copy and share it with your client.",
    );
  } catch (error) {
    return toActionError(error, { fallback: "Failed to create invitation." });
  }
};

// ──────────────────────────────────────────────
// Revoke client access
// ──────────────────────────────────────────────

/**
 * Revoke a client's access to a specific project.
 * Deletes the ProjectAccess row AND all ClientSessions for that email,
 * so the client immediately loses portal access on next request.
 */
export const revokeClientAccess = async (
  data: RevokeAccessInput,
): Promise<ActionResponseType<RevokeAccessResult>> => {
  const validated = revokeAccessSchema.safeParse(data);
  if (!validated.success) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid input",
      validated.error.flatten().fieldErrors,
    );
  }

  // Client-facing actions are lead-level (quality gate): inviting,
  // re-inviting, and revoking portal access push work to the client.
  const access = await resolveProjectAccess(validated.data.projectId);
  if (!access.ok) return access.error;

  if (!access.value.canSubmitForReview) {
    return ActionResponse.failure(
      ERROR_CODES.FORBIDDEN,
      "Only a project lead can manage client access.",
    );
  }

  try {
    // 1. Delete ProjectAccess
    const result = await db.projectAccess.deleteMany({
      where: {
        projectId: validated.data.projectId,
        email: validated.data.email,
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
      where: { email: validated.data.email },
    });

    revalidatePortalPages();
    return ActionResponse.success(
      {
        revoked: true,
        email: validated.data.email,
        projectId: validated.data.projectId,
      },
      "Client access revoked successfully",
    );
  } catch (error) {
    return toActionError(error, {
      fallback: "Failed to revoke client access.",
    });
  }
};

// ──────────────────────────────────────────────
// Re-invite client
// ──────────────────────────────────────────────

/**
 * Generate a fresh invitation link for a client.
 * Invalidates any previous unaccepted invitations for this email+project.
 * No email is sent — the freelancer copies and shares the link manually.
 */
export const resendInvitation = async (
  data: InviteClientInput,
): Promise<ActionResponseType<ResendInvitationResult>> => {
  const validated = inviteClientSchema.safeParse(data);
  if (!validated.success) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid input",
      validated.error.flatten().fieldErrors,
    );
  }

  // Client-facing actions are lead-level (quality gate): inviting,
  // re-inviting, and revoking portal access push work to the client.
  const access = await resolveProjectAccess(validated.data.projectId);
  if (!access.ok) return access.error;

  if (!access.value.canSubmitForReview) {
    return ActionResponse.failure(
      ERROR_CODES.FORBIDDEN,
      "Only a project lead can manage client access.",
    );
  }

  try {
    // Invalidate old links + create a fresh invitation
    const invitation = await createInvitation(
      validated.data.projectId,
      validated.data.email,
    );

    const acceptUrl = `${env.NEXT_PUBLIC_APP_URL}/api/portal/accept?token=${invitation.token}`;

    revalidatePortalPages();
    return ActionResponse.success(
      { ...invitation, acceptUrl },
      "New invitation link generated. Copy and share it with your client.",
    );
  } catch (error) {
    return toActionError(error, {
      fallback: "Failed to generate new invitation.",
    });
  }
};
