import { describe, expect, it } from "vitest";
import { addCommentSchema } from "@/lib/validation/comment";

describe("addCommentSchema", () => {
  it("accepts valid deliverable comment", () => {
    const result = addCommentSchema.safeParse({
      targetType: "deliverable",
      targetId: "abc-123",
      content: "Looks great!",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid request comment", () => {
    const result = addCommentSchema.safeParse({
      targetType: "request",
      targetId: "abc-123",
      content: "Please revise the colors.",
    });
    expect(result.success).toBe(true);
  });

  it("trims whitespace", () => {
    const result = addCommentSchema.safeParse({
      targetType: "deliverable",
      targetId: "abc-123",
      content: "  Looks great!  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content).toBe("Looks great!");
    }
  });

  it("rejects empty content", () => {
    const result = addCommentSchema.safeParse({
      targetType: "deliverable",
      targetId: "abc-123",
      content: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects whitespace-only content", () => {
    const result = addCommentSchema.safeParse({
      targetType: "deliverable",
      targetId: "abc-123",
      content: "   ",
    });
    expect(result.success).toBe(false);
  });

  it("rejects content over 5000 characters", () => {
    const result = addCommentSchema.safeParse({
      targetType: "deliverable",
      targetId: "abc-123",
      content: "a".repeat(5001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid targetType", () => {
    const result = addCommentSchema.safeParse({
      targetType: "invoice",
      targetId: "abc-123",
      content: "Hello",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty targetId", () => {
    const result = addCommentSchema.safeParse({
      targetType: "deliverable",
      targetId: "",
      content: "Hello",
    });
    expect(result.success).toBe(false);
  });
});
