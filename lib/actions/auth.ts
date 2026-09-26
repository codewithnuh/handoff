"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { env } from "@/env";
import { auth } from "@/lib/auth";
import type { AuthUser, Session } from "@/lib/auth";
import { defineAction } from "@/lib/actions/define";
import { toActionError } from "@/lib/actions/helpers";
import { ActionResponse } from "@/lib/utils/action-response";
import type { ActionResponseType } from "@/lib/types/action";
import { ERROR_CODES } from "@/lib/constants/errors";
import {
  loginSchema,
  registerSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  verifyOtpSchema,
} from "@/lib/validation/auth";
import { db } from "../prisma";

// ──────────────────────────────────────────────
// Result types (standardized response payloads)
// ──────────────────────────────────────────────

export type RegisterResult = { user: AuthUser; workspaceId: string };
export type LoginResult = { user: AuthUser };
export type LogoutResult = { success: boolean };
export type PasswordResetResult = { status: boolean };
export type SessionResult = Session | null;
export type SendOtpResult = { delivered: boolean };
export type VerifyOtpResult = { verified: boolean };

// ──────────────────────────────────────────────
// Server Actions
// ──────────────────────────────────────────────

/**
 * Register a new account with email + password.
 * On success Better Auth also starts a session for the new user.
 */
export const register = defineAction({
  schema: registerSchema,
  guard: null,
  run: async (input): Promise<ActionResponseType<RegisterResult>> => {
    let createdUserId: string | null = null;

    try {
      const { name, email, password } = input;

      // 1. Create Identity via Better Auth
      const result = await auth.api.signUpEmail({
        body: { name, email, password },
        headers: await headers(),
      });

      if (!result.user) {
        throw new Error("Failed to create user");
      }

      createdUserId = result.user.id;

      // 2. Atomic Workspace + Subscription Creation & Active Workspace Link
      const workspace = await db.$transaction(async (tx) => {
        // Create default workspace and its free subscription tier
        const ws = await tx.workspace.create({
          data: {
            name: `${name}'s Workspace`,
            ownerId: result.user.id,

          },
        });

        // Link newly created workspace as activeWorkspaceId on User model
        await tx.user.update({
          where: { id: result.user.id },
          data: { activeWorkspaceId: ws.id },
        });

        return ws;
      });

      return ActionResponse.success(
        { user: result.user, workspaceId: workspace.id },
        "Account created — we sent a verification code to your email",
      );
    } catch (error) {
      // 3. Rollback: Clean up orphaned auth user if DB setup fails
      if (createdUserId) {
        await db.user.delete({ where: { id: createdUserId } }).catch(() => {
          // Log critical rollback error if user deletion fails
        });
      }

      return toActionError(error);
    }
  },
});

/** Sign in with email + password. */
export const login = defineAction({
  schema: loginSchema,
  guard: null,
  // Only block login when there is an actual session (data is non-null).
  check: async () => {
    const sessionState = await getSession();
    return sessionState.success && sessionState.data
      ? ActionResponse.failure(
          ERROR_CODES.ALREADY_SIGNED_IN,
          "You are already signed in",
        )
      : null;
  },
  run: async (input): Promise<ActionResponseType<LoginResult>> => {
    const result = await auth.api.signInEmail({
      body: input,
      headers: await headers(),
    });
    return ActionResponse.success(
      { user: result.user },
      "Signed in successfully",
    );
  },
});

/** Sign out the current session. */
export const logout = defineAction({
  guard: null,
  run: async (): Promise<ActionResponseType<LogoutResult>> => {
    const result = await auth.api.signOut({ headers: await headers() });
    return ActionResponse.success(result, "Signed out successfully");
  },
});

/**
 * Send a password reset email.
 * Better Auth returns the same response whether or not the account exists,
 * so we always report success (anti user-enumeration).
 */
export const requestPasswordReset = defineAction({
  schema: requestPasswordResetSchema,
  guard: null,
  run: async (input): Promise<ActionResponseType<PasswordResetResult>> => {
    const result = await auth.api.requestPasswordReset({
      body: {
        email: input.email,
        redirectTo: `${env.NEXT_PUBLIC_APP_URL}/reset-password?verify=true`,
      },
      headers: await headers(),
    });
    return ActionResponse.success(
      { status: result.status },
      "If an account exists for that email, a reset link has been sent",
    );
  },
});

/** Complete a password reset using the token from the reset email. */
export const resetPassword = defineAction({
  schema: resetPasswordSchema,
  guard: null,
  run: async (input): Promise<ActionResponseType<PasswordResetResult>> => {
    const result = await auth.api.resetPassword({
      body: input,
      headers: await headers(),
    });
    return ActionResponse.success(
      { status: result.status },
      "Password reset successfully",
    );
  },
});

/**
 * Send (or resend) an email-verification OTP to the signed-in user.
 * The email-otp plugin rate-limits sends to 3/minute per email.
 */
export const sendVerificationOtp = defineAction({
  guard: null,
  run: async (): Promise<ActionResponseType<SendOtpResult>> => {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return ActionResponse.failure(
        ERROR_CODES.UNAUTHORIZED,
        "You must be signed in to verify your email",
      );
    }
    if (session.user.emailVerified) {
      return ActionResponse.failure(
        ERROR_CODES.CONFLICT,
        "Your email is already verified",
      );
    }

    await auth.api.sendVerificationOTP({
      body: { email: session.user.email, type: "email-verification" },
      headers: await headers(),
    });

    return ActionResponse.success(
      { delivered: true },
      `We sent a 6-digit code to ${session.user.email}`,
    );
  },
});

/** Verify the signed-in user's email address with a 6-digit code. */
export const verifyEmailOtp = defineAction({
  schema: z.string(),
  guard: null,
  run: async (otp): Promise<ActionResponseType<VerifyOtpResult>> => {
    const validated = verifyOtpSchema.safeParse({ otp });
    if (!validated.success) {
      return ActionResponse.failure(
        ERROR_CODES.VALIDATION_ERROR,
        validated.error.flatten().fieldErrors.otp?.[0] ?? "Invalid code",
      );
    }

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return ActionResponse.failure(
        ERROR_CODES.UNAUTHORIZED,
        "You must be signed in to verify your email",
      );
    }
    if (session.user.emailVerified) {
      return ActionResponse.success(
        { verified: true },
        "Your email is already verified",
      );
    }

    await auth.api.verifyEmailOTP({
      body: { email: session.user.email, otp: validated.data.otp },
      headers: await headers(),
    });

    return ActionResponse.success({ verified: true }, "Email verified");
  },
});

/** Get the current session (null when signed out). */
export const getSession = defineAction({
  guard: null,
  run: async (): Promise<ActionResponseType<SessionResult>> => {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return ActionResponse.success(null, "No active session");
    }

    return ActionResponse.success(session, "Active session found");
  },
});
