import { beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { APIError } from "better-auth/api";
import {
  getSession,
  login,
  logout,
  register,
  requestPasswordReset,
  resetPassword,
} from "@/lib/actions/auth";
import type {
  LoginResult,
  LogoutResult,
  PasswordResetResult,
  RegisterResult,
  SessionResult,
} from "@/lib/actions/auth";
import { auth } from "@/lib/auth";
import type { AuthUser, Session } from "@/lib/auth";
import { ERROR_CODES } from "@/lib/constants/errors";
import type { ActionResponseType } from "@/lib/types/action";

// ──────────────────────────────────────────────
// Mocks
// ──────────────────────────────────────────────

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("@/env", () => ({
  env: { NEXT_PUBLIC_APP_URL: "http://localhost:3000" },
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      signUpEmail: vi.fn(),
      signInEmail: vi.fn(),
      signOut: vi.fn(),
      requestPasswordReset: vi.fn(),
      resetPassword: vi.fn(),
      getSession: vi.fn(),
    },
  },
}));

const signUpEmail = vi.mocked(auth.api.signUpEmail);
const signInEmail = vi.mocked(auth.api.signInEmail);
const signOut = vi.mocked(auth.api.signOut);
const requestPasswordResetApi = vi.mocked(auth.api.requestPasswordReset);
const resetPasswordApi = vi.mocked(auth.api.resetPassword);
const getSessionApi = vi.mocked(auth.api.getSession);

// ──────────────────────────────────────────────
// Fixtures (typed against the real Better Auth types)
// ──────────────────────────────────────────────

const userFixture: AuthUser = {
  id: "user-1",
  name: "John Doe",
  email: "john@example.com",
  emailVerified: false,
  image: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

const sessionFixture = {
  id: "session-1",
  token: "session-token",
  userId: "user-1",
  expiresAt: new Date("2026-02-01T00:00:00.000Z"),
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  ipAddress: null,
  userAgent: null,
} satisfies Session["session"];

type HttpStatus = ConstructorParameters<typeof APIError>[0];

const apiError = (status: number, message: string) =>
  new APIError(status as HttpStatus, { message });

beforeEach(() => {
  vi.clearAllMocks();
});

// ──────────────────────────────────────────────
// Response contract (type safety)
// ──────────────────────────────────────────────

describe("response contract", () => {
  it("every action returns the standardized ActionResponseType union", () => {
    expectTypeOf<Awaited<ReturnType<typeof register>>>().toEqualTypeOf<
      ActionResponseType<RegisterResult>
    >();
    expectTypeOf<Awaited<ReturnType<typeof login>>>().toEqualTypeOf<
      ActionResponseType<LoginResult>
    >();
    expectTypeOf<Awaited<ReturnType<typeof logout>>>().toEqualTypeOf<
      ActionResponseType<LogoutResult>
    >();
    expectTypeOf<
      Awaited<ReturnType<typeof requestPasswordReset>>
    >().toEqualTypeOf<ActionResponseType<PasswordResetResult>>();
    expectTypeOf<Awaited<ReturnType<typeof resetPassword>>>().toEqualTypeOf<
      ActionResponseType<PasswordResetResult>
    >();
    expectTypeOf<Awaited<ReturnType<typeof getSession>>>().toEqualTypeOf<
      ActionResponseType<SessionResult>
    >();
  });
});

// ──────────────────────────────────────────────
// register
// ──────────────────────────────────────────────

describe("register", () => {
  it("rejects invalid input with a VALIDATION_ERROR and field errors", async () => {
    const result = await register({
      name: "",
      email: "not-an-email",
      password: "short",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(result.error.fieldErrors?.email).toBeDefined();
      expect(result.error.fieldErrors?.password).toBeDefined();
    }
    expect(signUpEmail).not.toHaveBeenCalled();
  });

  it("registers a user and returns the created user", async () => {
    signUpEmail.mockResolvedValue({ token: "token-1", user: userFixture });

    const result = await register({
      name: "John Doe",
      email: "john@example.com",
      password: "password123",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expectTypeOf(result.data).toEqualTypeOf<RegisterResult>();
      expect(result.message).toBe("Account created successfully");
      expect(result.data.user.email).toBe("john@example.com");
    }
    expect(signUpEmail).toHaveBeenCalledWith({
      body: {
        name: "John Doe",
        email: "john@example.com",
        password: "password123",
      },
      headers: expect.any(Headers),
    });
  });

  it("maps a duplicate-account error to a failure response", async () => {
    signUpEmail.mockRejectedValue(
      apiError(422, "User already exists"),
    );

    const result = await register({
      name: "John Doe",
      email: "taken@example.com",
      password: "password123",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(result.message).toBe("User already exists");
    }
  });
});

// ──────────────────────────────────────────────
// login
// ──────────────────────────────────────────────

describe("login", () => {
  // `login` short-circuits if a session already exists (ALREADY_SIGNED_IN).
  // Default the session lookup to "signed out" so these tests reach the API.
  beforeEach(() => {
    getSessionApi.mockResolvedValue(null);
  });

  it("rejects invalid input without calling the API", async () => {
    const result = await login({ email: "bad", password: "" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    }
    expect(signInEmail).not.toHaveBeenCalled();
  });

  it("signs in and returns the user", async () => {
    signInEmail.mockResolvedValue({
      redirect: false,
      token: "token-1",
      user: userFixture,
    });

    const result = await login({
      email: "john@example.com",
      password: "password123",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expectTypeOf(result.data).toEqualTypeOf<LoginResult>();
      expect(result.data.user.email).toBe("john@example.com");
    }
    expect(signInEmail).toHaveBeenCalledWith({
      body: { email: "john@example.com", password: "password123" },
      headers: expect.any(Headers),
    });
  });

  it("maps invalid credentials to UNAUTHORIZED", async () => {
    signInEmail.mockRejectedValue(
      apiError(401, "Invalid email or password"),
    );

    const result = await login({
      email: "john@example.com",
      password: "wrong-password",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.UNAUTHORIZED);
      expect(result.message).toBe("Invalid email or password");
    }
  });
});

// ──────────────────────────────────────────────
// logout
// ──────────────────────────────────────────────

describe("logout", () => {
  it("signs out the current session", async () => {
    signOut.mockResolvedValue({ success: true });

    const result = await logout();

    expect(result.success).toBe(true);
    if (result.success) {
      expectTypeOf(result.data).toEqualTypeOf<LogoutResult>();
      expect(result.data.success).toBe(true);
    }
    expect(signOut).toHaveBeenCalledWith({
      headers: expect.any(Headers),
    });
  });

  it("maps an API error to a failure response", async () => {
    signOut.mockRejectedValue(apiError(500, "Internal Server Error"));

    const result = await logout();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.INTERNAL_ERROR);
    }
  });
});

// ──────────────────────────────────────────────
// requestPasswordReset
// ──────────────────────────────────────────────

describe("requestPasswordReset", () => {
  it("rejects an invalid email", async () => {
    const result = await requestPasswordReset({ email: "nope" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    }
    expect(requestPasswordResetApi).not.toHaveBeenCalled();
  });

  it("requests a reset link and always reports success (anti-enumeration)", async () => {
    requestPasswordResetApi.mockResolvedValue({
      status: true,
      message: "Password reset email sent",
    });

    const result = await requestPasswordReset({
      email: "john@example.com",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expectTypeOf(result.data).toEqualTypeOf<PasswordResetResult>();
      expect(result.data.status).toBe(true);
      expect(result.message).toContain("reset link has been sent");
    }
    expect(requestPasswordResetApi).toHaveBeenCalledWith({
      body: {
        email: "john@example.com",
        redirectTo: "http://localhost:3000/reset-password",
      },
      headers: expect.any(Headers),
    });
  });

  it("maps rate limiting to RATE_LIMITED", async () => {
    requestPasswordResetApi.mockRejectedValue(
      apiError(429, "Too many requests"),
    );

    const result = await requestPasswordReset({
      email: "john@example.com",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.RATE_LIMITED);
    }
  });
});

// ──────────────────────────────────────────────
// resetPassword
// ──────────────────────────────────────────────

describe("resetPassword", () => {
  it("rejects a short new password or missing token", async () => {
    const result = await resetPassword({ newPassword: "short", token: "" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    }
    expect(resetPasswordApi).not.toHaveBeenCalled();
  });

  it("resets the password with the provided token", async () => {
    resetPasswordApi.mockResolvedValue({ status: true });

    const result = await resetPassword({
      newPassword: "new-password-123",
      token: "reset-token",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expectTypeOf(result.data).toEqualTypeOf<PasswordResetResult>();
      expect(result.data.status).toBe(true);
    }
    expect(resetPasswordApi).toHaveBeenCalledWith({
      body: { newPassword: "new-password-123", token: "reset-token" },
      headers: expect.any(Headers),
    });
  });

  it("maps an invalid/expired token to UNAUTHORIZED", async () => {
    resetPasswordApi.mockRejectedValue(apiError(401, "Invalid token"));

    const result = await resetPassword({
      newPassword: "new-password-123",
      token: "expired-token",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.UNAUTHORIZED);
    }
  });
});

// ──────────────────────────────────────────────
// getSession
// ──────────────────────────────────────────────

describe("getSession", () => {
  it("returns null when there is no active session", async () => {
    getSessionApi.mockResolvedValue(null);

    const result = await getSession();

    expect(result.success).toBe(true);
    if (result.success) {
      expectTypeOf(result.data).toEqualTypeOf<SessionResult>();
      expect(result.data).toBeNull();
      expect(result.message).toBe("No active session");
    }
  });

  it("returns the active session and user", async () => {
    getSessionApi.mockResolvedValue({
      session: sessionFixture,
      user: userFixture,
    });

    const result = await getSession();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.user.email).toBe("john@example.com");
      expect(result.data?.session.token).toBe("session-token");
    }
    expect(getSessionApi).toHaveBeenCalledWith({
      headers: expect.any(Headers),
    });
  });

  it("maps an API error to a failure response", async () => {
    getSessionApi.mockRejectedValue(apiError(500, "Internal Server Error"));

    const result = await getSession();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.INTERNAL_ERROR);
    }
  });
});
