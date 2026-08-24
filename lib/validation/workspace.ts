import { z } from "zod";
import { idSchema, nameSchema } from "@/lib/validation/shared";

export const createWorkspaceSchema = z.object({
  name: nameSchema,
});
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;

export const updateWorkspaceSchema = z.object({
  name: nameSchema,
});
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;

export const workspaceIdSchema = z.object({
  id: idSchema,
});
export type WorkspaceIdInput = z.infer<typeof workspaceIdSchema>;
