import { z } from "zod";
import { idSchema, emailSchema } from "@/lib/validation/shared";

export const inviteClientSchema = z.object({
  projectId: idSchema,
  email: emailSchema,
});
export type InviteClientInput = z.infer<typeof inviteClientSchema>;

export const listInvitationsSchema = z.object({
  projectId: idSchema,
});
export type ListInvitationsInput = z.infer<typeof listInvitationsSchema>;
