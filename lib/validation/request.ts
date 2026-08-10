import { z } from "zod";
import {
  idSchema,
  optionalNullableString,
  titleSchema,
  requestStatusSchema,
} from "@/lib/validation/shared";

export const createRequestSchema = z.object({
  projectId: idSchema,
  title: titleSchema,
  description: optionalNullableString(5000, "Description"),
});
export type CreateRequestInput = z.infer<typeof createRequestSchema>;

export const updateRequestSchema = z.object({
  id: idSchema,
  title: titleSchema.optional(),
  description: optionalNullableString(5000, "Description"),
});
export type UpdateRequestInput = z.infer<typeof updateRequestSchema>;

export const requestIdSchema = z.object({
  id: idSchema,
});
export type RequestIdInput = z.infer<typeof requestIdSchema>;

export const projectRequestsSchema = z.object({
  projectId: idSchema,
});
export type ProjectRequestsInput = z.infer<typeof projectRequestsSchema>;

export const updateRequestStatusSchema = z.object({
  id: idSchema,
  status: requestStatusSchema,
});
export type UpdateRequestStatusInput = z.infer<
  typeof updateRequestStatusSchema
>;
