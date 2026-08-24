import { z } from "zod";
import { idSchema, emailSchema } from "@/lib/validation/shared";

export const inviteClientSchema = z.object({
  projectId: idSchema,
  email: emailSchema,
});
export type InviteClientInput = z.infer<typeof inviteClientSchema>;

export const revokeAccessSchema = z.object({
  projectId: idSchema,
  email: emailSchema,
});
export type RevokeAccessInput = z.infer<typeof revokeAccessSchema>;
