import { describe, expect, it, vi } from "vitest";
import { claimFileForVersion } from "./claim-file";

function transaction(file: unknown, intentClaimCount: number) {
  return {
    file: {
      findFirst: vi.fn().mockResolvedValue(file),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    fileUploadIntent: {
      updateMany: vi.fn().mockResolvedValue({ count: intentClaimCount }),
    },
  };
}

describe("single-project file attachment", () => {
  it("rejects a file ID outside the target project or owned by another uploader", async () => {
    const tx = transaction(null, 1);
    await expect(claimFileForVersion(tx as never, { fileId: "foreign-file", projectId: "project-b", userId: "user-a" })).rejects.toThrow("unavailable");
    expect(tx.fileUploadIntent.updateMany).not.toHaveBeenCalled();
  });

  it("claims a completed upload once and marks its file attached", async () => {
    const tx = transaction({ id: "file-a", uploadIntentId: "intent-a" }, 1);
    await expect(claimFileForVersion(tx as never, { fileId: "file-a", projectId: "project-a", userId: "user-a" })).resolves.toBe("file-a");
    expect(tx.fileUploadIntent.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ projectId: "project-a", userId: "user-a", status: "COMPLETE" }),
      data: { status: "ATTACHED" },
    }));
    expect(tx.file.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "file-a", attachedAt: null, projectId: "project-a" },
    }));
  });

  it("rejects replayed attachment after the intent has already been consumed", async () => {
    const tx = transaction({ id: "file-a", uploadIntentId: "intent-a" }, 0);
    await expect(claimFileForVersion(tx as never, { fileId: "file-a", projectId: "project-a", userId: "user-a" })).rejects.toThrow("expired or has already been attached");
    expect(tx.file.updateMany).not.toHaveBeenCalled();
  });
});
