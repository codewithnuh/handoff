"use server";

import type { Task } from "@/app/generated/prisma/client";
import { db } from "@/lib/prisma";
import { toActionError } from "@/lib/actions/helpers";
import { revalidateDashboard } from "@/lib/actions/revalidate";
import { resolveProjectAccess } from "@/lib/actions/guards";
import { ERROR_CODES } from "@/lib/constants/errors";
import { assertWorkspaceWritable } from "@/lib/services/plan-limits";
import type { ActionResponseType } from "@/lib/types/action";
import { ActionResponse } from "@/lib/utils/action-response";
import {
  createTaskSchema,
  reorderTasksSchema,
  taskIdSchema,
  updateTaskSchema,
} from "@/lib/validation/task";
import type {
  CreateTaskInput,
  ReorderTasksInput,
  TaskIdInput,
  UpdateTaskInput,
} from "@/lib/validation/task";

export type TaskResult = Task;

/**
 * Tasks are day-to-day freelancer work — anyone who can work on the
 * project (lead/contributor) manages them; observers are read-only.
 */
async function requireWorkAccess(projectId: string) {
  const access = await resolveProjectAccess(projectId);
  if (!access.ok) return access;
  if (access.value.isObserver || !access.value.canManageDeliverables) {
    return {
      ok: false as const,
      error: ActionResponse.failure(
        ERROR_CODES.FORBIDDEN,
        "You have view-only access to this project.",
      ),
    };
  }
  const readOnlyError = await assertWorkspaceWritable(access.value.workspaceId);
  if (readOnlyError) return { ok: false as const, error: readOnlyError };
  return access;
}

export const createTask = async (
  data: CreateTaskInput,
): Promise<ActionResponseType<TaskResult>> => {
  const validated = createTaskSchema.safeParse(data);
  if (!validated.success) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid input",
      validated.error.flatten().fieldErrors,
    );
  }

  const access = await requireWorkAccess(validated.data.projectId);
  if (!access.ok) return access.error;

  try {
    const status = validated.data.status ?? "TODO";
    const last = await db.task.findFirst({
      where: {
        projectId: validated.data.projectId,
        status,
      },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const task = await db.task.create({
      data: {
        projectId: validated.data.projectId,
        title: validated.data.title,
        description: validated.data.description ?? null,
        status,
        position: (last?.position ?? -1) + 1,
      },
    });

    // No activity-log entry on purpose: task churn would flood the
    // client-facing timeline. The board itself is the record.
    revalidateDashboard();
    return ActionResponse.success(task, "Task created");
  } catch (error) {
    return toActionError(error, { fallback: "Failed to create the task." });
  }
};

export const updateTask = async (
  data: UpdateTaskInput,
): Promise<ActionResponseType<TaskResult>> => {
  const validated = updateTaskSchema.safeParse(data);
  if (!validated.success) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid input",
      validated.error.flatten().fieldErrors,
    );
  }

  try {
    const existing = await db.task.findUnique({
      where: { id: validated.data.id },
      select: { id: true, projectId: true },
    });
    if (!existing) {
      return ActionResponse.failure(ERROR_CODES.NOT_FOUND, "Task not found.");
    }

    const access = await requireWorkAccess(existing.projectId);
    if (!access.ok) return access.error;

    const patch: Record<string, unknown> = {};
    if (validated.data.title !== undefined) patch.title = validated.data.title;
    if (validated.data.description !== undefined)
      patch.description = validated.data.description;

    const task = await db.task.update({
      where: { id: existing.id },
      data: patch,
    });
    revalidateDashboard();
    return ActionResponse.success(task, "Task updated");
  } catch (error) {
    return toActionError(error, { fallback: "Failed to update the task." });
  }
};

export const deleteTask = async (
  data: TaskIdInput,
): Promise<ActionResponseType<{ deleted: boolean }>> => {
  const validated = taskIdSchema.safeParse(data);
  if (!validated.success) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid input",
      validated.error.flatten().fieldErrors,
    );
  }

  try {
    const existing = await db.task.findUnique({
      where: { id: validated.data.id },
      select: { id: true, projectId: true },
    });
    if (!existing) {
      return ActionResponse.failure(ERROR_CODES.NOT_FOUND, "Task not found.");
    }

    const access = await requireWorkAccess(existing.projectId);
    if (!access.ok) return access.error;

    await db.task.delete({ where: { id: existing.id } });
    revalidateDashboard();
    return ActionResponse.success({ deleted: true }, "Task deleted");
  } catch (error) {
    return toActionError(error, { fallback: "Failed to delete the task." });
  }
};

/**
 * Persists a drag-and-drop result: status + ordering for the affected
 * tasks, atomically. The client sends only what changed.
 */
export const reorderTasks = async (
  data: ReorderTasksInput,
): Promise<ActionResponseType<{ updated: number }>> => {
  const validated = reorderTasksSchema.safeParse(data);
  if (!validated.success) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid input",
      validated.error.flatten().fieldErrors,
    );
  }

  const access = await requireWorkAccess(validated.data.projectId);
  if (!access.ok) return access.error;

  try {
    // Verify all touched tasks belong to this project before writing
    const ids = validated.data.items.map((i) => i.id);
    const owned = await db.task.count({
      where: { id: { in: ids }, projectId: validated.data.projectId },
    });
    if (owned !== ids.length) {
      return ActionResponse.failure(
        ERROR_CODES.FORBIDDEN,
        "Some tasks don't belong to this project.",
      );
    }

    await db.$transaction(
      validated.data.items.map((item) =>
        db.task.update({
          where: { id: item.id },
          data: { status: item.status, position: item.position },
        }),
      ),
    );

    revalidateDashboard();
    return ActionResponse.success(
      { updated: validated.data.items.length },
      "Board updated",
    );
  } catch (error) {
    return toActionError(error, { fallback: "Failed to save the board." });
  }
};
