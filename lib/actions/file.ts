"use server";

import type { File } from "@/app/generated/prisma/client";
import { db } from "@/lib/prisma";
import { toActionError } from "@/lib/actions/helpers";
import type { ActionResponseType } from "@/lib/types/action";
import { ActionResponse } from "@/lib/utils/action-response";
import { ERROR_CODES } from "@/lib/constants/errors";

export type FileResult = File;

export type CreateFileInput = {
  key: string;
  filename: string;
  mimeType?: string | null;
  size?: number | null;
};

/**
 * Creates a File record in the database after an uploadthing upload.
 * Returns the created File so it can be linked to a DeliverableVersion.
 */
export const createFile = async (
  data: CreateFileInput,
): Promise<ActionResponseType<FileResult>> => {
  try {
    const file = await db.file.create({
      data: {
        key: data.key,
        filename: data.filename,
        mimeType: data.mimeType ?? null,
        size: data.size ?? null,
      },
    });

    return ActionResponse.success(file, "File saved");
  } catch (error) {
    return toActionError(error, { fallback: "Failed to save file metadata." });
  }
};
