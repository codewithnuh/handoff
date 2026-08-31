import { z } from "zod";

export const createFileSchema = z.object({
  key: z.string().trim().min(1, "File key is required").max(500),
  filename: z.string().trim().min(1, "Filename is required").max(255),
  mimeType: z.string().trim().max(127).nullable().optional(),
  size: z.number().int().nonnegative().nullable().optional(),
});

export type CreateFileInput = z.infer<typeof createFileSchema>;
