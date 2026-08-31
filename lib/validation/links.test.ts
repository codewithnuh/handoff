import { describe, expect, it } from "vitest";
import { revokeLinkSchema, bulkRevokeSchema } from "@/lib/validation/links";

describe("revokeLinkSchema", () => {
  it("accepts valid team link", () => {
    const result = revokeLinkSchema.safeParse({ id: "abc-123", type: "team" });
    expect(result.success).toBe(true);
  });

  it("accepts valid client link", () => {
    const result = revokeLinkSchema.safeParse({ id: "abc-123", type: "client" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid type", () => {
    const result = revokeLinkSchema.safeParse({ id: "abc-123", type: "invalid" });
    expect(result.success).toBe(false);
  });

  it("rejects empty id", () => {
    const result = revokeLinkSchema.safeParse({ id: "", type: "team" });
    expect(result.success).toBe(false);
  });
});

describe("bulkRevokeSchema", () => {
  it("accepts valid input", () => {
    const result = bulkRevokeSchema.safeParse({
      ids: ["abc-123", "def-456"],
      type: "team",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty ids array", () => {
    const result = bulkRevokeSchema.safeParse({ ids: [], type: "team" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid type", () => {
    const result = bulkRevokeSchema.safeParse({
      ids: ["abc-123"],
      type: "invalid",
    });
    expect(result.success).toBe(false);
  });
});
