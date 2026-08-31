import { z } from "zod";

export const addCommentSchema = z.object({
  targetType: z.enum(["deliverable", "request"]),
  targetId: z.string().min(1),
  content: z
    .string()
    .trim()
    .min(1, "Comment cannot be empty")
    .max(5000, "Comment must be at most 5000 characters"),
});
export type AddCommentInput = z.infer<typeof addCommentSchema>;
