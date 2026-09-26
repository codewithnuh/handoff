"use server";

import type { Task } from "@/app/generated/prisma/client";
import { db } from "@/lib/prisma";
import { defineAction } from "@/lib/actions/define";
import { resolveProjectAccess } from "@/lib/access";
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

export const createTask = defineAction({
  schema: createTaskSchema,
  guard: (input) => requireWorkAccess(input.projectId),
  revalidate: true,
  errors: { fallback: "Failed to create the task." },
  run: async (input): Promise<ActionResponseType<TaskResult>> => {
    const status = input.status ?? "TODO";
    const last = await db.task.findFirst({
      where: {
        projectId: input.projectId,
        status,
      },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const task = await db.task.create({
      data: {
        projectId: input.projectId,
        title: input.title,
        description: input.description ?? null,
        status,
        position: (last?.position ?? -1) + 1,
      },
    });

    // No activity-log entry on purpose: task churn would flood the
    // client-facing timeline. The board itself is the record.
    return ActionResponse.success(task, "Task created");
  },
});

export const updateTask = defineAction({
  schema: updateTaskSchema,
  guard: null,
  revalidate: true,
  errors: { fallback: "Failed to update the task." },
  run: async (input): Promise<ActionResponseType<TaskResult>> => {
    const existing = await db.task.findUnique({
      where: { id: input.id },
      select: { id: true, projectId: true },
    });
    if (!existing) {
      return ActionResponse.failure(ERROR_CODES.NOT_FOUND, "Task not found.");
    }

    const access = await requireWorkAccess(existing.projectId);
    if (!access.ok) return access.error;

    const patch: Record<string, unknown> = {};
    if (input.title !== undefined) patch.title = input.title;
    if (input.description !== undefined) patch.description = input.description;

    const task = await db.task.update({
      where: { id: existing.id },
      data: patch,
    });
    return ActionResponse.success(task, "Task updated");
  },
});

export const deleteTask = defineAction({
  schema: taskIdSchema,
  guard: null,
  revalidate: true,
  errors: { fallback: "Failed to delete the task." },
  run: async (input): Promise<ActionResponseType<{ deleted: boolean }>> => {
    const existing = await db.task.findUnique({
      where: { id: input.id },
      select: { id: true, projectId: true },
    });
    if (!existing) {
      return ActionResponse.failure(ERROR_CODES.NOT_FOUND, "Task not found.");
    }

    const access = await requireWorkAccess(existing.projectId);
    if (!access.ok) return access.error;

    await db.task.delete({ where: { id: existing.id } });
    return ActionResponse.success({ deleted: true }, "Task deleted");
  },
});

/**
 * Persists a drag-and-drop result: status + ordering for the affected
 * tasks, atomically. The client sends only what changed.
 */
export const reorderTasks = defineAction({
  schema: reorderTasksSchema,
  guard: (input) => requireWorkAccess(input.projectId),
  revalidate: true,
  errors: { fallback: "Failed to save the board." },
  run: async (input): Promise<ActionResponseType<{ updated: number }>> => {
    // Verify all touched tasks belong to this project before writing
    const ids = input.items.map((i) => i.id);
    const owned = await db.task.count({
      where: { id: { in: ids }, projectId: input.projectId },
    });
    if (owned !== ids.length) {
      return ActionResponse.failure(
        ERROR_CODES.FORBIDDEN,
        "Some tasks don't belong to this project.",
      );
    }

    await db.$transaction(
      input.items.map((item) =>
        db.task.update({
          where: { id: item.id },
          data: { status: item.status, position: item.position },
        }),
      ),
    );

    return ActionResponse.success(
      { updated: input.items.length },
      "Board updated",
    );
  },
});
