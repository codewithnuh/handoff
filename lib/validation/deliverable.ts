import { z } from "zod";
import {
  deliverableStatusSchema,
  idSchema,
  optionalNullableString,
  titleSchema,
} from "@/lib/validation/shared";

export const createDeliverableSchema = z.object({
  projectId: idSchema,
  title: titleSchema,
  description: optionalNullableString(5000, "Description"),
});
export type CreateDeliverableInput = z.infer<
  typeof createDeliverableSchema
>;

export const updateDeliverableSchema = z.object({
  id: idSchema,
  title: titleSchema.optional(),
  description: optionalNullableString(5000, "Description"),
  status: deliverableStatusSchema.optional(),
  /**
   * Optimistic locking: version the caller loaded. When provided, a
   * mismatch returns CONFLICT instead of overwriting concurrent changes.
   */
  expectedVersion: z.number().int().positive().optional(),
});
export type UpdateDeliverableInput = z.infer<
  typeof updateDeliverableSchema
>;

export const deliverableIdSchema = z.object({
  id: idSchema,
});
export type DeliverableIdInput = z.infer<typeof deliverableIdSchema>;

export const projectDeliverablesSchema = z.object({
  projectId: idSchema,
});
export type ProjectDeliverablesInput = z.infer<
  typeof projectDeliverablesSchema
>;

export const createDeliverableVersionSchema = z.object({
  deliverableId: idSchema,
  versionNumber: z
    .number()
    .int({ message: "Version number must be a whole number" })
    .positive({ message: "Version number must be positive" })
    .optional(),
  fileId: idSchema.optional(),
  notes: optionalNullableString(2000, "Notes"),
});
export type CreateDeliverableVersionInput = z.infer<
  typeof createDeliverableVersionSchema
>;
