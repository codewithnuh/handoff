import { z } from "zod";
import { idSchema } from "@/lib/validation/shared";

/** Comment content is required and capped; author info is derived server-side. */
export const createCommentOnDeliverableSchema = z.object({
  deliverableId: idSchema,
  content: z
    .string()
    .trim()
    .min(1, { message: "Comment content is required" })
    .max(5000, { message: "Comment must be at most 5000 characters" }),
});
export type CreateCommentOnDeliverableInput = z.infer<
  typeof createCommentOnDeliverableSchema
>;

export const createCommentOnRequestSchema = z.object({
  requestId: idSchema,
  content: z
    .string()
    .trim()
    .min(1, { message: "Comment content is required" })
    .max(5000, { message: "Comment must be at most 5000 characters" }),
});
export type CreateCommentOnRequestInput = z.infer<
  typeof createCommentOnRequestSchema
>;

export const deliverablesCommentsSchema = z.object({
  deliverableId: idSchema,
});
export type DeliverableCommentsInput = z.infer<
  typeof deliverablesCommentsSchema
>;

export const requestCommentsSchema = z.object({
  requestId: idSchema,
});
export type RequestCommentsInput = z.infer<typeof requestCommentsSchema>;

export const commentIdSchema = z.object({
  id: idSchema,
});
export type CommentIdInput = z.infer<typeof commentIdSchema>;
