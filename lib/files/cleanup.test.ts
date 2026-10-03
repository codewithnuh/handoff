import { describe, expect, it, vi } from "vitest";
import { cleanupAbandonedUpload } from "./cleanup";

function fakeDb(claimCount: number) {
  const tx = {
    file: {
      findFirst: vi.fn().mockResolvedValue({ uploadIntentId: "intent-a" }),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    fileUploadIntent: { updateMany: vi.fn().mockResolvedValue({ count: claimCount }) },
  };
  const db = { $transaction: vi.fn((callback) => callback(tx)) };
  return { db, tx };
}

const file = { id: "file-a", key: "provider-key", uploadIntentId: "intent-a" };

describe("abandoned upload cleanup", () => {
  it("does not delete provider data if attachment won the claim race", async () => {
    const { db } = fakeDb(0);
    const storage = { deleteByKey: vi.fn(), deleteByCustomId: vi.fn() };
    await expect(cleanupAbandonedUpload(db as never, storage, file)).resolves.toBe(false);
    expect(storage.deleteByKey).not.toHaveBeenCalled();
  });

  it("leaves cleanup pending for retry when provider deletion fails", async () => {
    const { db, tx } = fakeDb(1);
    const storage = {
      deleteByKey: vi.fn().mockResolvedValue({ success: false }),
      deleteByCustomId: vi.fn(),
    };
    await expect(cleanupAbandonedUpload(db as never, storage, file)).rejects.toThrow("Provider key deletion failed");
    expect(tx.fileUploadIntent.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: "CLEANUP_PENDING" } }));
    expect(storage.deleteByCustomId).not.toHaveBeenCalled();
  });

  it("removes an unattached object and marks the intent cleaned", async () => {
    const { db, tx } = fakeDb(1);
    const storage = {
      deleteByKey: vi.fn().mockResolvedValue({ success: true }),
      deleteByCustomId: vi.fn().mockResolvedValue({ success: true }),
    };
    await expect(cleanupAbandonedUpload(db as never, storage, file)).resolves.toBe(true);
    expect(tx.file.deleteMany).toHaveBeenCalledOnce();
    expect(storage.deleteByCustomId).toHaveBeenCalledWith("intent-a");
    expect(tx.fileUploadIntent.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({ data: { status: "CLEANED" } }));
  });
});
