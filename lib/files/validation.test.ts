import { describe, expect, it } from "vitest";
import { isUploadMetadataValid, validateUploadMetadata } from "./validation";

describe("upload metadata validation", () => {
  it("normalizes unsafe filename separators and control characters", () => {
    expect(validateUploadMetadata({ name: "../report\n.pdf", type: "application/pdf", size: 12 })).toEqual({
      filename: ".._report.pdf",
      mimeType: "application/pdf",
      size: 12,
    });
  });

  it("rejects unsupported MIME types, empty names, and oversized files", () => {
    expect(isUploadMetadataValid({ name: "x.exe", type: "application/x-msdownload", size: 12 })).toBe(false);
    expect(isUploadMetadataValid({ name: "", type: "application/pdf", size: 12 })).toBe(false);
    expect(isUploadMetadataValid({ name: "large.pdf", type: "application/pdf", size: 32 * 1024 * 1024 + 1 })).toBe(false);
    expect(isUploadMetadataValid({ name: "zero.pdf", type: "application/pdf", size: 0 })).toBe(false);
  });
});
