import { describe, expect, it, vi } from "vitest";
import type { Prisma } from "@/app/generated/prisma/client";
import { recordActivity } from "@/lib/actions/activity";

vi.mock("@/lib/prisma", async () => ({
  db: (await import("@/lib/test/fake-db")).fakeDb,
}));

describe("recordActivity", () => {
  it("propagates transaction write failures so the owning mutation rolls back", async () => {
    const failure = new Error("activity insert failed");
    const create = vi.fn().mockRejectedValue(failure);
    const tx = { activity: { create } } as unknown as Prisma.TransactionClient;

    await expect(
      recordActivity({ projectId: "project-1", type: "COMMENT_ADDED" }, tx),
    ).rejects.toBe(failure);
    expect(create).toHaveBeenCalledWith({
      data: { projectId: "project-1", type: "COMMENT_ADDED" },
    });
  });
});
