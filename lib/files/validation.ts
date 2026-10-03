export const MAX_UPLOAD_INTENT_AGE_MS = 60 * 60 * 1000;

const MAX_SIZE_BY_MIME: Record<string, number> = {
  "application/pdf": 32 * 1024 * 1024,
  "application/zip": 32 * 1024 * 1024,
  "application/msword": 16 * 1024 * 1024,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": 16 * 1024 * 1024,
  "application/vnd.ms-excel": 16 * 1024 * 1024,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": 16 * 1024 * 1024,
  "application/vnd.ms-powerpoint": 16 * 1024 * 1024,
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": 16 * 1024 * 1024,
  "application/postscript": 16 * 1024 * 1024,
  "text/plain": 8 * 1024 * 1024,
  "text/csv": 8 * 1024 * 1024,
  "image/png": 16 * 1024 * 1024,
  "image/jpeg": 16 * 1024 * 1024,
  "image/gif": 16 * 1024 * 1024,
  "image/webp": 16 * 1024 * 1024,
};

export function validateUploadMetadata(file: {
  name: string;
  size: number;
  type: string;
}) {
  if (!Number.isSafeInteger(file.size) || file.size <= 0) {
    throw new Error("The uploaded file has an invalid size.");
  }

  const mimeType = file.type.toLowerCase();
  const maxSize = MAX_SIZE_BY_MIME[mimeType];
  if (!maxSize || file.size > maxSize) {
    throw new Error("This file type or size is not allowed.");
  }

  const filename = file.name
    .replace(/[\\/]/g, "_")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim();
  if (!filename || filename === "." || filename === ".." || filename.length > 255) {
    throw new Error("The uploaded filename is invalid.");
  }

  return { filename, mimeType, size: file.size };
}

export const isUploadMetadataValid = (file: {
  name: string;
  size: number;
  type: string;
}): boolean => {
  try {
    validateUploadMetadata(file);
    return true;
  } catch {
    return false;
  }
};
