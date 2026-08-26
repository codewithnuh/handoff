"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { toActionError } from "@/lib/actions/helpers";
import { requireAuth } from "@/lib/actions/guards";
import { revalidateDashboard } from "@/lib/actions/revalidate";
import { ERROR_CODES } from "@/lib/constants/errors";
import type { ActionResponseType } from "@/lib/types/action";
import { ActionResponse } from "@/lib/utils/action-response";
import { nameSchema } from "@/lib/validation/shared";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required").max(128),
  newPassword: z.string().min(8).max(128),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/**
 * Changes the signed-in user's password (verifies the current one) and
 * revokes other sessions.
 */
export const changePassword = async (
  data: ChangePasswordInput,
): Promise<ActionResponseType<{ changed: boolean }>> => {
  const validated = changePasswordSchema.safeParse(data);
  if (!validated.success) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid input",
      validated.error.flatten().fieldErrors,
    );
  }

  const guard = await requireAuth();
  if (!guard.ok) return guard.error;

  try {
    await auth.api.changePassword({
      body: {
        currentPassword: validated.data.currentPassword,
        newPassword: validated.data.newPassword,
        revokeOtherSessions: true,
      },
      headers: await headers(),
    });
    return ActionResponse.success(
      { changed: true },
      "Password updated. Other sessions were signed out.",
    );
  } catch (error) {
    return toActionError(error, {
      fallback: "Couldn't update the password. Check your current password.",
    });
  }
};

const updateProfileSchema = z.object({
  name: nameSchema,
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/**
 * Updates the signed-in user's display name. Email is intentionally
 * immutable here — it's the identity used for invites and portal access.
 */
export const updateProfile = async (
  data: UpdateProfileInput,
): Promise<ActionResponseType<{ name: string; email: string }>> => {
  const validated = updateProfileSchema.safeParse(data);
  if (!validated.success) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid input",
      validated.error.flatten().fieldErrors,
    );
  }

  const guard = await requireAuth();
  if (!guard.ok) return guard.error;

  try {
    await auth.api.updateUser({
      body: { name: validated.data.name },
      headers: await headers(),
    });

    const user = await db.user.findUnique({
      where: { id: guard.value.id },
      select: { name: true, email: true },
    });

    revalidateDashboard();
    return ActionResponse.success(
      { name: user?.name ?? validated.data.name, email: user?.email ?? "" },
      "Profile updated",
    );
  } catch (error) {
    return toActionError(error, { fallback: "Couldn't save your profile." });
  }
};
