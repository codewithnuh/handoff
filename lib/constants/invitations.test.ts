import { describe, expect, it } from "vitest";
import { INVITE_TTL_MS, INVITE_TTL_SECONDS } from "@/lib/constants/invitations";

describe("INVITE_TTL_MS", () => {
  it("equals 7 days in milliseconds", () => {
    expect(INVITE_TTL_MS).toBe(1000 * 60 * 60 * 24 * 7);
  });

  it("is a positive number", () => {
    expect(INVITE_TTL_MS).toBeGreaterThan(0);
  });
});

describe("INVITE_TTL_SECONDS", () => {
  it("equals 7 days in seconds", () => {
    expect(INVITE_TTL_SECONDS).toBe(60 * 60 * 24 * 7);
  });

  it("matches INVITE_TTL_MS when converted", () => {
    expect(INVITE_TTL_SECONDS * 1000).toBe(INVITE_TTL_MS);
  });
});
