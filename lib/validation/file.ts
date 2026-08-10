import { z } from "zod";
import {
  idSchema,
  nonNegativeIntSchema,
  optionalNullableString,
} from "@/lib/validation/shared";

export const createFileSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1, { message: "Storage key is required" })
    .max(1024, { message: "Storage key must be at most 1024 characters" }),
  filename: z
    .string()
    .trim()
    .min(1, { message: "Filename is required" })
    .max(255, { message: "Filename must be at most 255 characters" }),
  mimeType: optionalNullableString(120, "MIME type"),
  size: nonNegativeIntSchema.optional(),
});
export type CreateFileInput = z.infer<typeof createFileSchema>;

export const fileIdSchema = z.object({
  id: idSchema,
});
export type FileIdInput = z.infer<typeof fileIdSchema>;
