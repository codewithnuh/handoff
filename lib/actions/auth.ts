"use server";

import { headers } from "next/headers";
import { APIError } from "better-auth/api";
import { env } from "@/env";
import { auth } from "@/lib/auth";
import type { AuthUser, Session } from "@/lib/auth";
import { ActionResponse } from "@/lib/utils/action-response";
import type { ActionError, ActionResponseType } from "@/lib/types/action";
import { ERROR_CODES } from "@/lib/constants/errors";
import type { ErrorCode } from "@/lib/constants/errors";
import {
  loginSchema,
  registerSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
} from "@/lib/validation/auth";
import type {
  LoginInput,
  RegisterInput,
  RequestPasswordResetInput,
  ResetPasswordInput,
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

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

const errorCodeForStatus = (status: number | string): ErrorCode => {
  const code = typeof status === "string" ? Number(status) : status;
  switch (code) {
    case 400:
    case 422:
      return ERROR_CODES.VALIDATION_ERROR;
    case 401:
      return ERROR_CODES.UNAUTHORIZED;
    case 403:
      return ERROR_CODES.FORBIDDEN;
    case 409:
      return ERROR_CODES.CONFLICT;
    case 429:
      return ERROR_CODES.RATE_LIMITED;
    default:
      return ERROR_CODES.INTERNAL_ERROR;
  }
};

const toActionError = (error: unknown): ActionError => {
  if (error instanceof APIError) {
    return ActionResponse.failure(
      errorCodeForStatus(error.status),
      error.message,
    );
  }
  console.error("Unexpected auth action error:", error);
  return ActionResponse.failure(
    ERROR_CODES.INTERNAL_ERROR,
    "Something went wrong. Please try again.",
  );
};

// ──────────────────────────────────────────────
// Server Actions
// ──────────────────────────────────────────────

/**
 * Register a new account with email + password.
 * On success Better Auth also starts a session for the new user.
 */
export const register = async (
  data: RegisterInput,
): Promise<ActionResponseType<RegisterResult>> => {
  const validated = registerSchema.safeParse(data);
  if (!validated.success) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid input",
      validated.error.flatten().fieldErrors,
    );
  }

  let createdUserId: string | null = null;

  try {
    const { name, email, password } = validated.data;

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
          subscription: {
            create: {
              plan: "FREE",
              status: "ACTIVE",
            },
          },
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
      "Account created successfully",
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
};

/** Sign in with email + password. */
export const login = async (
  data: LoginInput,
): Promise<ActionResponseType<LoginResult>> => {
  const validated = loginSchema.safeParse(data);
  if (!validated.success) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid input",
      validated.error.flatten().fieldErrors,
    );
  }
  // Only block login when there is an actual session (data is non-null).
  const sessionState = await getSession();
  if (sessionState.success && sessionState.data) {
    return ActionResponse.failure(
      ERROR_CODES.ALREADY_SIGNED_IN,
      "You are already signed in",
    );
  }
  try {
    const result = await auth.api.signInEmail({
      body: validated.data,
      headers: await headers(),
    });
    return ActionResponse.success(
      { user: result.user },
      "Signed in successfully",
    );
  } catch (error) {
    return toActionError(error);
  }
};

/** Sign out the current session. */
export const logout = async (): Promise<ActionResponseType<LogoutResult>> => {
  try {
    const result = await auth.api.signOut({ headers: await headers() });
    return ActionResponse.success(result, "Signed out successfully");
  } catch (error) {
    return toActionError(error);
  }
};

/**
 * Send a password reset email.
 * Better Auth returns the same response whether or not the account exists,
 * so we always report success (anti user-enumeration).
 */
export const requestPasswordReset = async (
  data: RequestPasswordResetInput,
): Promise<ActionResponseType<PasswordResetResult>> => {
  const validated = requestPasswordResetSchema.safeParse(data);
  if (!validated.success) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid input",
      validated.error.flatten().fieldErrors,
    );
  }

  try {
    const result = await auth.api.requestPasswordReset({
      body: {
        email: validated.data.email,
        redirectTo: `${env.NEXT_PUBLIC_APP_URL}/reset-password?verify=true`,
      },
      headers: await headers(),
    });
    return ActionResponse.success(
      { status: result.status },
      "If an account exists for that email, a reset link has been sent",
    );
  } catch (error) {
    return toActionError(error);
  }
};

/** Complete a password reset using the token from the reset email. */
export const resetPassword = async (
  data: ResetPasswordInput,
): Promise<ActionResponseType<PasswordResetResult>> => {
  const validated = resetPasswordSchema.safeParse(data);
  if (!validated.success) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid input",
      validated.error.flatten().fieldErrors,
    );
  }

  try {
    const result = await auth.api.resetPassword({
      body: validated.data,
      headers: await headers(),
    });
    return ActionResponse.success(
      { status: result.status },
      "Password reset successfully",
    );
  } catch (error) {
    return toActionError(error);
  }
};

/** Get the current session (null when signed out). */
export const getSession = async (): Promise<
  ActionResponseType<SessionResult>
> => {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return ActionResponse.success(null, "No active session");
    }

    return ActionResponse.success(session, "Active session found");
  } catch (error) {
    return toActionError(error);
  }
};
