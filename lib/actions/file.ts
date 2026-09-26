"use server";

import type { File } from "@/app/generated/prisma/client";
import { db } from "@/lib/prisma";
import { defineAction } from "@/lib/actions/define";
import type { ActionResponseType } from "@/lib/types/action";
import { ActionResponse } from "@/lib/utils/action-response";
import { createFileSchema } from "@/lib/validation/file";

export type FileResult = File;

/**
 * Creates a File record in the database after an uploadthing upload.
 * Returns the created File so it can be linked to a DeliverableVersion.
 */
export const createFile = defineAction({
  schema: createFileSchema,
  errors: { fallback: "Failed to save file metadata." },
  run: async (input): Promise<ActionResponseType<FileResult>> => {
    const file = await db.file.create({
      data: {
        key: input.key,
        filename: input.filename,
        mimeType: input.mimeType ?? null,
        size: input.size ?? null,
      },
    });

    return ActionResponse.success(file, "File saved");
  },
});
