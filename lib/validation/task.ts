import { z } from "zod";
import { TaskStatus } from "@/app/generated/prisma/client";
import {
  idSchema,
  optionalNullableString,
  titleSchema,
} from "@/lib/validation/shared";
import { enumTuple } from "@/lib/validation/shared";

const taskStatusEnum = z.enum(enumTuple(TaskStatus));

export const createTaskSchema = z.object({
  projectId: idSchema,
  title: titleSchema,
  description: optionalNullableString(2000, "Description"),
  // Column the task is added to (defaults to To Do)
  status: taskStatusEnum.optional(),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z.object({
  id: idSchema,
  title: titleSchema.optional(),
  description: optionalNullableString(2000, "Description").optional(),
});
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const taskIdSchema = z.object({ id: idSchema });
export type TaskIdInput = z.infer<typeof taskIdSchema>;

/** Batched reorder/move from the drag-and-drop board. */
export const reorderTasksSchema = z.object({
  projectId: idSchema,
  items: z
    .array(
      z.object({
        id: idSchema,
        status: taskStatusEnum,
        position: z.number().int().min(0).max(100_000),
      }),
    )
    .min(1)
    .max(300),
});
export type ReorderTasksInput = z.infer<typeof reorderTasksSchema>;

export type TaskStatusValue = z.infer<typeof taskStatusEnum>;
