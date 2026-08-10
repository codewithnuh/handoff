import { z } from "zod";
import { nameSchema } from "@/lib/validation/shared";

export const createWorkspaceSchema = z.object({
  name: nameSchema,
});
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;

export const updateWorkspaceSchema = z.object({
  name: nameSchema,
});
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
