import { z } from "zod";
import { idSchema, requestStatusSchema } from "@/lib/validation/shared";

export const updateRequestStatusSchema = z.object({
  id: idSchema,
  status: requestStatusSchema,
});
export type UpdateRequestStatusInput = z.infer<
  typeof updateRequestStatusSchema
>;
