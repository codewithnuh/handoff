import { Prisma } from "@/app/generated/prisma/client";
import { APIError } from "better-auth/api";
import { ERROR_CODES } from "@/lib/constants/errors";
import type { ErrorCode } from "@/lib/constants/errors";
import type { ActionError } from "@/lib/types/action";
import { ActionResponse } from "@/lib/utils/action-response";

type ErrorMapOptions = {
  /** Fallback message when the error doesn't match a known code. */
  fallback?: string;
  /** Message used when a unique constraint is violated (Prisma P2002). */
  conflict?: string;
  /** Message used when a record is not found (Prisma P2025). */
  notFound?: string;
  /** Message used when a foreign-key/referential violation occurs (Prisma P2003/P2014). */
  referenced?: string;
};

const isPrismaKnownError = (
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError =>
  error instanceof Prisma.PrismaClientKnownRequestError;

const isAPIError = (error: unknown): error is APIError =>
  error instanceof APIError ||
  (error instanceof Error &&
    error.name === "APIError" &&
    "status" in error &&
    "statusCode" in error);

/** Maps an HTTP status code (number or string) to the closest ErrorCode. */
const errorCodeForStatus = (status: number | string): ErrorCode => {
  // Handle string status codes like "UNAUTHORIZED", "FORBIDDEN", etc.
  if (typeof status === "string" && isNaN(Number(status))) {
    const map: Record<string, ErrorCode> = {
      BAD_REQUEST: ERROR_CODES.VALIDATION_ERROR,
      UNAUTHORIZED: ERROR_CODES.UNAUTHORIZED,
      FORBIDDEN: ERROR_CODES.FORBIDDEN,
      NOT_FOUND: ERROR_CODES.NOT_FOUND,
      CONFLICT: ERROR_CODES.CONFLICT,
      UNPROCESSABLE_ENTITY: ERROR_CODES.VALIDATION_ERROR,
      TOO_MANY_REQUESTS: ERROR_CODES.RATE_LIMITED,
    };
    return map[status] ?? ERROR_CODES.INTERNAL_ERROR;
  }

  const code = typeof status === "string" ? Number(status) : status;
  switch (code) {
    case 400:
    case 422:
      return ERROR_CODES.VALIDATION_ERROR;
    case 401:
      return ERROR_CODES.UNAUTHORIZED;
    case 403:
      return ERROR_CODES.FORBIDDEN;
    case 404:
      return ERROR_CODES.NOT_FOUND;
    case 409:
      return ERROR_CODES.CONFLICT;
    case 429:
      return ERROR_CODES.RATE_LIMITED;
    default:
      return ERROR_CODES.INTERNAL_ERROR;
  }
};

/**
 * Maps any thrown value to the standardized `ActionError` shape.
 * Handles (in order):
 *   1. Better Auth APIError — mapped by HTTP status code
 *   2. Prisma known errors — translated to consistent ERROR_CODES
 *   3. Everything else — logged and returned as INTERNAL_ERROR
 */
export const toActionError = (
  error: unknown,
  options: ErrorMapOptions = {},
): ActionError => {
  const {
    fallback = "Something went wrong. Please try again.",
    conflict = "A record with these details already exists.",
    notFound = "The requested record was not found.",
    referenced = "This record can't be deleted because it is still in use.",
  } = options;

  // 1. Better Auth API errors
  if (isAPIError(error)) {
    return ActionResponse.failure(
      errorCodeForStatus(error.statusCode ?? error.status),
      error.message,
    );
  }

  // 2. Prisma known errors
  if (isPrismaKnownError(error)) {
    switch (error.code) {
      case "P2002":
        return ActionResponse.failure(ERROR_CODES.CONFLICT, conflict);
      case "P2025":
        return ActionResponse.failure(ERROR_CODES.NOT_FOUND, notFound);
      case "P2003":
      case "P2014":
        return ActionResponse.failure(ERROR_CODES.CONFLICT, referenced);
      default:
        console.error("Prisma error:", error);
        return ActionResponse.failure(
          ERROR_CODES.DATABASE_ERROR,
          "The database could not complete this request.",
        );
    }
  }

  // 3. Unknown errors
  console.error("Unexpected action error:", error);
  return ActionResponse.failure(ERROR_CODES.INTERNAL_ERROR, fallback);
};
