import { z } from "zod";
import { idSchema } from "@/lib/validation/shared";

export const clientApproveDeliverableSchema = z.object({
  deliverableId: idSchema,
  expectedVersion: z.number().int().nonnegative(),
});

export type ClientApproveDeliverableInput = z.infer<
  typeof clientApproveDeliverableSchema
>;

export const clientRequestChangesSchema = z.object({
  deliverableId: idSchema,
  expectedVersion: z.number().int().nonnegative(),
  comment: z
    .string()
    .trim()
    .max(5000, "Comment must be at most 5000 characters")
    .nullable()
    .optional(),
});

export type ClientRequestChangesInput = z.infer<
  typeof clientRequestChangesSchema
>;

export const clientAddCommentSchema = z.object({
  targetType: z.enum(["deliverable", "request"]),
  targetId: idSchema,
  content: z
    .string()
    .trim()
    .min(1, "Comment cannot be empty")
    .max(5000, "Comment must be at most 5000 characters"),
});

export type ClientAddCommentInput = z.infer<typeof clientAddCommentSchema>;

export const clientCreateRequestSchema = z.object({
  projectId: idSchema,
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be at most 200 characters"),
  description: z
    .string()
    .trim()
    .max(5000, "Description must be at most 5000 characters")
    .nullable()
    .optional(),
});

export type ClientCreateRequestInput = z.infer<typeof clientCreateRequestSchema>;
