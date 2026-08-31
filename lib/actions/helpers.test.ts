import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@/app/generated/prisma/client";
import { APIError } from "better-auth/api";
import { toActionError } from "@/lib/actions/helpers";
import { ERROR_CODES } from "@/lib/constants/errors";

// server-only guard is a no-op in the vitest environment
vi.mock("server-only", () => ({}));

describe("toActionError", () => {
  it("maps Prisma P2002 to CONFLICT", () => {
    const error = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed",
      { code: "P2002", clientVersion: "6.12.0" },
    );
    const result = toActionError(error);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.CONFLICT);
    }
  });

  it("maps Prisma P2025 to NOT_FOUND", () => {
    const error = new Prisma.PrismaClientKnownRequestError(
      "Record not found",
      { code: "P2025", clientVersion: "6.12.0" },
    );
    const result = toActionError(error);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.NOT_FOUND);
    }
  });

  it("maps Prisma P2003 to CONFLICT (referenced)", () => {
    const error = new Prisma.PrismaClientKnownRequestError(
      "Foreign key constraint failed",
      { code: "P2003", clientVersion: "6.12.0" },
    );
    const result = toActionError(error);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.CONFLICT);
    }
  });

  it("maps APIError to correct error code", () => {
    // APIError constructor: new APIError(status, opts)
    // Status is a string like "UNAUTHORIZED", "FORBIDDEN", etc.
    const error = new APIError("UNAUTHORIZED", {
      message: "Not authenticated",
    });
    const result = toActionError(error);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.UNAUTHORIZED);
      expect(result.message).toBe("Not authenticated");
    }
  });

  it("maps APIError FORBIDDEN to FORBIDDEN", () => {
    const error = new APIError("FORBIDDEN", { message: "Access denied" });
    const result = toActionError(error);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.FORBIDDEN);
    }
  });

  it("maps APIError CONFLICT to CONFLICT", () => {
    const error = new APIError("CONFLICT", { message: "Already exists" });
    const result = toActionError(error);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.CONFLICT);
    }
  });

  it("maps unknown errors to INTERNAL_ERROR", () => {
    const error = new Error("something broke");
    const result = toActionError(error);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.INTERNAL_ERROR);
    }
  });

  it("uses custom fallback message", () => {
    const error = new Error("oops");
    const result = toActionError(error, { fallback: "Custom fallback" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.message).toBe("Custom fallback");
    }
  });

  it("uses custom conflict message for P2002", () => {
    const error = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint",
      { code: "P2002", clientVersion: "6.12.0" },
    );
    const result = toActionError(error, { conflict: "Email already taken" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.message).toBe("Email already taken");
    }
  });
});
