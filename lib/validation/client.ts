import { z } from "zod";
import {
  companySchema,
  idSchema,
  nameSchema,
  emailSchema,
} from "@/lib/validation/shared";

export const createClientSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  company: companySchema,
});
export type CreateClientInput = z.infer<typeof createClientSchema>;

export const updateClientSchema = z.object({
  id: idSchema,
  name: nameSchema.optional(),
  email: emailSchema.optional(),
  company: companySchema,
});
export type UpdateClientInput = z.infer<typeof updateClientSchema>;

export const clientIdSchema = z.object({
  id: idSchema,
});
export type ClientIdInput = z.infer<typeof clientIdSchema>;
