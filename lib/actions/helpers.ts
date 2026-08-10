import { Prisma } from "@/app/generated/prisma/client";
import { ERROR_CODES } from "@/lib/constants/errors";
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

/**
 * Maps any thrown value to the standardized `ActionError` shape.
 * Prisma known errors are translated to consistent `ERROR_CODES`;
 * everything else becomes an `INTERNAL_ERROR` (and is logged).
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

  console.error("Unexpected action error:", error);
  return ActionResponse.failure(ERROR_CODES.INTERNAL_ERROR, fallback);
};
