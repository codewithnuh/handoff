"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { defineAction } from "@/lib/actions/define";
import { requireAuth } from "@/lib/access";
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
export const changePassword = defineAction({
  schema: changePasswordSchema,
  guard: requireAuth,
  errors: {
    fallback: "Couldn't update the password. Check your current password.",
  },
  run: async (input): Promise<ActionResponseType<{ changed: boolean }>> => {
    await auth.api.changePassword({
      body: {
        currentPassword: input.currentPassword,
        newPassword: input.newPassword,
        revokeOtherSessions: true,
      },
      headers: await headers(),
    });
    return ActionResponse.success(
      { changed: true },
      "Password updated. Other sessions were signed out.",
    );
  },
});

const updateProfileSchema = z.object({
  name: nameSchema,
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/**
 * Updates the signed-in user's display name. Email is intentionally
 * immutable here — it's the identity used for invites and portal access.
 */
export const updateProfile = defineAction({
  schema: updateProfileSchema,
  guard: requireAuth,
  revalidate: true,
  errors: { fallback: "Couldn't save your profile." },
  run: async (
    input,
    ctx,
  ): Promise<ActionResponseType<{ name: string; email: string }>> => {
    await auth.api.updateUser({
      body: { name: input.name },
      headers: await headers(),
    });

    const user = await db.user.findUnique({
      where: { id: ctx.id },
      select: { name: true, email: true },
    });

    return ActionResponse.success(
      { name: user?.name ?? input.name, email: user?.email ?? "" },
      "Profile updated",
    );
  },
});
