import { z } from "zod";
import {
  idSchema,
  nameSchema,
  optionalDateSchema,
  optionalNullableString,
  progressSchema,
  projectStatusSchema,
} from "@/lib/validation/shared";

export const createProjectSchema = z.object({
  clientId: idSchema,
  name: nameSchema,
  description: optionalNullableString(5000, "Description"),
  status: projectStatusSchema.optional(),
  progress: progressSchema.optional(),
  startDate: optionalDateSchema,
  dueDate: optionalDateSchema,
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = createProjectSchema
  .omit({ clientId: true })
  .extend({
    id: idSchema,
    clientId: idSchema.optional(),
  });
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export const projectIdSchema = z.object({
  id: idSchema,
});
export type ProjectIdInput = z.infer<typeof projectIdSchema>;

export const updateProjectStatusSchema = z.object({
  id: idSchema,
  status: projectStatusSchema,
});
export type UpdateProjectStatusInput = z.infer<
  typeof updateProjectStatusSchema
>;

export const updateProjectProgressSchema = z.object({
  id: idSchema,
  progress: progressSchema,
});
export type UpdateProjectProgressInput = z.infer<
  typeof updateProjectProgressSchema
>;
