"use server";

import { revalidatePath } from "next/cache";
import type { File as FileModel } from "@/app/generated/prisma/client";
import { db } from "@/lib/prisma";
import { toActionError } from "@/lib/actions/helpers";
import { requireWorkspace } from "@/lib/actions/guards";
import { ERROR_CODES } from "@/lib/constants/errors";
import type { ActionResponseType } from "@/lib/types/action";
import { ActionResponse } from "@/lib/utils/action-response";
import { createFileSchema, fileIdSchema } from "@/lib/validation/file";
import type { CreateFileInput, FileIdInput } from "@/lib/validation/file";

// ──────────────────────────────────────────────
// Result types
// ──────────────────────────────────────────────

export type FileResult = FileModel;
export type FileListResult = { items: FileModel[] };
export type DeleteFileResult = { deleted: boolean };

const arena = "/";

// ──────────────────────────────────────────────
// Server Actions
// Files are storage metadata only; the actual blob upload
// happens separately (S3/R2/local), then this records the reference.
// ──────────────────────────────────────────────

export const listFiles = async (): Promise<
  ActionResponseType<FileListResult>
> => {
  const guard = await requireWorkspace();
  if (!guard.ok) return guard.error;

  try {
    const items = await db.file.findMany({
      orderBy: { createdAt: "desc" },
    });
    return ActionResponse.success({ items }, "Files loaded");
  } catch (error) {
    return toActionError(error, { fallback: "Failed to load files." });
  }
};

export const getFile = async (
  data: FileIdInput,
): Promise<ActionResponseType<FileResult>> => {
  const validated = fileIdSchema.safeParse(data);
  if (!validated.success) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid input",
      validated.error.flatten().fieldErrors,
    );
  }

  const guard = await requireWorkspace();
  if (!guard.ok) return guard.error;

  try {
    const file = await db.file.findUnique({
      where: { id: validated.data.id },
    });
    if (!file) {
      return ActionResponse.failure(
        ERROR_CODES.NOT_FOUND,
        "File not found.",
      );
    }
    return ActionResponse.success(file, "File loaded");
  } catch (error) {
    return toActionError(error, { fallback: "Failed to load the file." });
  }
};

export const createFile = async (
  data: CreateFileInput,
): Promise<ActionResponseType<FileResult>> => {
  const validated = createFileSchema.safeParse(data);
  if (!validated.success) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid input",
      validated.error.flatten().fieldErrors,
    );
  }

  const guard = await requireWorkspace();
  if (!guard.ok) return guard.error;

  try {
    const file = await db.file.create({
      data: {
        key: validated.data.key,
        filename: validated.data.filename,
        mimeType: validated.data.mimeType ?? null,
        size: validated.data.size,
      },
    });
    revalidatePath(arena);
    return ActionResponse.success(file, "File created successfully");
  } catch (error) {
    return toActionError(error, { fallback: "Failed to create the file." });
  }
};

export const deleteFile = async (
  data: FileIdInput,
): Promise<ActionResponseType<DeleteFileResult>> => {
  const validated = fileIdSchema.safeParse(data);
  if (!validated.success) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid input",
      validated.error.flatten().fieldErrors,
    );
  }

  const guard = await requireWorkspace();
  if (!guard.ok) return guard.error;

  try {
    const file = await db.file.findUnique({
      where: { id: validated.data.id },
      select: { id: true },
    });
    if (!file) {
      return ActionResponse.failure(
        ERROR_CODES.NOT_FOUND,
        "File not found.",
      );
    }

    await db.file.delete({ where: { id: validated.data.id } });
    revalidatePath(arena);
    return ActionResponse.success({ deleted: true }, "File deleted");
  } catch (error) {
    return toActionError(error, { fallback: "Failed to delete the file." });
  }
};
