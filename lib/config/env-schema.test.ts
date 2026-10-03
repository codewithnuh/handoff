import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  describeEnvironmentErrors,
  parsePublicEnvironment,
  parseServerEnvironment,
} from "@/lib/config/env-schema";

const validUploadThingToken = () =>
  Buffer.from(
    JSON.stringify({
      apiKey: `sk_${randomBytes(32).toString("hex")}`,
      appId: "handoff-tests",
      regions: ["us-east-1"],
    }),
  ).toString("base64");

const validEnvironment = (
  overrides: Record<string, string | undefined> = {},
) => ({
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/handoff_test",
  AUTH_SECRET: randomBytes(32).toString("hex"),
  BETTER_AUTH_SECRET: randomBytes(32).toString("hex"),
  BETTER_AUTH_URL: "http://localhost:3000",
  NODE_ENV: "test",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  UPLOADTHING_TOKEN: validUploadThingToken(),
  ...overrides,
});

describe("server environment validation", () => {
  it("accepts a valid test configuration and normalizes empty optional values", () => {
    const result = parseServerEnvironment(
      validEnvironment({ SMTP_HOST: "", SMTP_PORT: "", EMAIL_FROM: "" }),
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.SMTP_HOST).toBeUndefined();
    expect(result.data.SMTP_PORT).toBeUndefined();
    expect(result.data.EMAIL_FROM).toBeUndefined();
  });

  it("rejects malformed database, auth, and public URLs", () => {
    const server = parseServerEnvironment(
      validEnvironment({
        DATABASE_URL: "https://database.example.test",
        BETTER_AUTH_URL: "ftp://auth.example.test",
      }),
    );
    const publicResult = parsePublicEnvironment({
      NEXT_PUBLIC_APP_URL: "javascript:alert(1)",
    });

    expect(server.success).toBe(false);
    expect(publicResult.success).toBe(false);
  });

  it("rejects invalid SMTP ports and sender addresses", () => {
    const result = parseServerEnvironment(
      validEnvironment({ SMTP_PORT: "not-a-port", EMAIL_FROM: "not an address" }),
    );

    expect(result.success).toBe(false);
  });

  it("requires mail and a valid UploadThing token in production", () => {
    const result = parseServerEnvironment(
      validEnvironment({
        NODE_ENV: "production",
        SMTP_HOST: "",
        SMTP_PORT: "",
        EMAIL_FROM: "",
        UPLOADTHING_TOKEN: "not-a-token",
      }),
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    const message = describeEnvironmentErrors("server", result.error);
    expect(message).toContain("SMTP_HOST: is required in production");
    expect(message).toContain("SMTP_PORT: is required in production");
    expect(message).toContain("EMAIL_FROM: is required in production");
    expect(message).toContain("UPLOADTHING_TOKEN");
    expect(message).not.toContain("not-a-token");
  });

  it("accepts distinct strong production secrets and safe SMTP fixtures", () => {
    const result = parseServerEnvironment(
      validEnvironment({
        NODE_ENV: "production",
        SMTP_HOST: "smtp.invalid",
        SMTP_PORT: "587",
        EMAIL_FROM: "Handoff <ci@example.invalid>",
      }),
    );

    expect(result.success).toBe(true);
  });

  it("rejects weak or reused production secrets without including their values", () => {
    const weakSecret = "a".repeat(40);
    const result = parseServerEnvironment(
      validEnvironment({
        NODE_ENV: "production",
        AUTH_SECRET: weakSecret,
        BETTER_AUTH_SECRET: weakSecret,
        SMTP_HOST: "smtp.invalid",
        SMTP_PORT: "587",
        EMAIL_FROM: "ci@example.invalid",
      }),
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    const message = describeEnvironmentErrors("server", result.error);
    expect(message).toContain("AUTH_SECRET");
    expect(message).toContain("BETTER_AUTH_SECRET");
    expect(message).not.toContain(weakSecret);
  });

  it("requires SMTP username and password together", () => {
    const result = parseServerEnvironment(
      validEnvironment({ SMTP_USER: "ci-user", SMTP_PASSWORD: "" }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(describeEnvironmentErrors("server", result.error)).toContain(
        "SMTP_PASSWORD: must be set together",
      );
    }
  });
});
