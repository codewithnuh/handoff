import { z } from "zod";
import { idSchema } from "@/lib/validation/shared";

export const revokeLinkSchema = z.object({
  id: idSchema,
  type: z.enum(["team", "client"]),
});
export type RevokeLinkInput = z.infer<typeof revokeLinkSchema>;

export const bulkRevokeSchema = z.object({
  ids: z.array(idSchema).min(1, "Select at least one link"),
  type: z.enum(["team", "client"]),
});
export type BulkRevokeInput = z.infer<typeof bulkRevokeSchema>;
