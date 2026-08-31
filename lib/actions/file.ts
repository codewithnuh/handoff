"use server";

import type { File } from "@/app/generated/prisma/client";
import { db } from "@/lib/prisma";
import { toActionError } from "@/lib/actions/helpers";
import { ERROR_CODES } from "@/lib/constants/errors";
import type { ActionResponseType } from "@/lib/types/action";
import { ActionResponse } from "@/lib/utils/action-response";
import { createFileSchema } from "@/lib/validation/file";
import type { CreateFileInput } from "@/lib/validation/file";

export type FileResult = File;

/**
 * Creates a File record in the database after an uploadthing upload.
 * Returns the created File so it can be linked to a DeliverableVersion.
 */
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

  try {
    const file = await db.file.create({
      data: {
        key: validated.data.key,
        filename: validated.data.filename,
        mimeType: validated.data.mimeType ?? null,
        size: validated.data.size ?? null,
      },
    });

    return ActionResponse.success(file, "File saved");
  } catch (error) {
    return toActionError(error, { fallback: "Failed to save file metadata." });
  }
};
