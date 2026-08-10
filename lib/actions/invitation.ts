"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { ClientInvitation } from "@/app/generated/prisma/client";
import { db } from "@/lib/prisma";
import { recordActivity } from "@/lib/actions/activity";
import { toActionError } from "@/lib/actions/helpers";
import {
  requireProjectInWorkspace,
  requireWorkspace,
} from "@/lib/actions/guards";
import { ERROR_CODES } from "@/lib/constants/errors";
import type { ActionResponseType } from "@/lib/types/action";
import { ActionResponse } from "@/lib/utils/action-response";
import {
  inviteClientSchema,
  listInvitationsSchema,
} from "@/lib/validation/invitation";
import type {
  InviteClientInput,
  ListInvitationsInput,
} from "@/lib/validation/invitation";

// ──────────────────────────────────────────────
// Result types
// ──────────────────────────────────────────────

export type ClientInvitationResult = ClientInvitation;
export type ClientInvitationListResult = { items: ClientInvitation[] };

const arena = "/";
const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

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

  const guard = await requireWorkspace();
  if (!guard.ok) return guard.error;

  const projectInScope = await requireProjectInWorkspace(
    guard.value.workspace.id,
    validated.data.projectId,
  );
  if (!projectInScope.ok) return projectInScope.error;

  try {
    const invitation = await db.clientInvitation.create({
      data: {
        projectId: validated.data.projectId,
        email: validated.data.email,
        token: randomBytes(32).toString("hex"),
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      },
    });

    await recordActivity({
      projectId: validated.data.projectId,
      type: "CLIENT_INVITED",
      actorUserId: guard.value.user.id,
      actorEmail: guard.value.user.email,
      actorName: guard.value.user.name,
      meta: { email: invitation.email },
    });

    revalidatePath(arena);
    return ActionResponse.success(
      invitation,
      "Client invited successfully",
    );
  } catch (error) {
    return toActionError(error, { fallback: "Failed to invite the client." });
  }
};

export const listClientInvitations = async (
  data: ListInvitationsInput,
): Promise<ActionResponseType<ClientInvitationListResult>> => {
  const validated = listInvitationsSchema.safeParse(data);
  if (!validated.success) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid input",
      validated.error.flatten().fieldErrors,
    );
  }

  const guard = await requireWorkspace();
  if (!guard.ok) return guard.error;

  const projectInScope = await requireProjectInWorkspace(
    guard.value.workspace.id,
    validated.data.projectId,
  );
  if (!projectInScope.ok) return projectInScope.error;

  try {
    const items = await db.clientInvitation.findMany({
      where: { projectId: validated.data.projectId },
      orderBy: { createdAt: "desc" },
    });
    return ActionResponse.success({ items }, "Invitations loaded");
  } catch (error) {
    return toActionError(error, { fallback: "Failed to load invitations." });
  }
};
