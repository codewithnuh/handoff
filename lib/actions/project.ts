"use server";

import type { Project } from "@/app/generated/prisma/client";
import { db } from "@/lib/prisma";
import { actorOf, recordActivity } from "@/lib/actions/activity";
import { can, defineAction, ensure, writable } from "@/lib/actions/define";
import {
  requireClientInWorkspace,
  requireWorkspacePermission,
  resolveProjectAccess,
  getVisibleProjectIds,
} from "@/lib/access";
import { ERROR_CODES } from "@/lib/constants/errors";
import { assertCanCreateProject } from "@/lib/services/plan-limits";
import type { ActionResponseType } from "@/lib/types/action";
import { ActionResponse } from "@/lib/utils/action-response";
import {
  createProjectSchema,
  projectIdSchema,
  updateProjectProgressSchema,
  updateProjectSchema,
  updateProjectStatusSchema,
} from "@/lib/validation/project";

// ──────────────────────────────────────────────
// Result types
// ──────────────────────────────────────────────

export type ProjectResult = Project;
export type ProjectListResult = { items: Project[] };
export type DeleteProjectResult = { deleted: boolean };

// ──────────────────────────────────────────────
// Server Actions
// ──────────────────────────────────────────────
export const listProjects = defineAction({
  errors: { fallback: "Failed to load projects." },
  run: async (ctx): Promise<ActionResponseType<ProjectListResult>> => {
    // Need-to-know scoping: regular members only see assigned projects
    const visibleIds = await getVisibleProjectIds(
      ctx.workspace.id,
      ctx.user.id,
      ctx.isAdmin,
    );

    const items = await db.project.findMany({
      where: {
        workspaceId: ctx.workspace.id,
        ...(visibleIds ? { id: { in: visibleIds } } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    return ActionResponse.success({ items }, "Projects loaded");
  },
});

export const getProject = defineAction({
  schema: projectIdSchema,
  guard: (input) => resolveProjectAccess(input.id),
  errors: { fallback: "Failed to load the project." },
  run: async (input, ctx): Promise<ActionResponseType<ProjectResult>> => {
    const project = await db.project.findFirst({
      where: {
        id: input.id,
        workspaceId: ctx.workspaceId,
      },
    });
    if (!project) {
      return ActionResponse.failure(
        ERROR_CODES.NOT_FOUND,
        "Project not found.",
      );
    }
    return ActionResponse.success(project, "Project loaded");
  },
});

export const createProject = defineAction({
  schema: createProjectSchema,
  // Creating projects requires CREATE_PROJECTS permission (admins always pass)
  guard: () => requireWorkspacePermission("CREATE_PROJECTS"),
  check: [
    ensure((ctx, input) =>
      requireClientInWorkspace(ctx.workspace.id, input.clientId),
    ),
    // 1. Enforce per-workspace project limit
    ensure((ctx) => assertCanCreateProject(ctx.workspace.id)),
    // 2. Check read-only mode (downgrade grace period expired)
    writable,
  ],
  revalidate: true,
  errors: { fallback: "Failed to create the project." },
  run: async (input, ctx): Promise<ActionResponseType<ProjectResult>> => {
    const creation = await db.$transaction(async (tx) => {
      // Serialize the final limit check and insert. The early pipeline check
      // gives a fast failure; this lock closes the concurrent create race.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`handoff:project-limit:${ctx.workspace.id}`}))`;
      const capacity = await assertCanCreateProject(ctx.workspace.id, tx);
      if (!capacity.ok) return capacity;

      const project = await tx.project.create({
        data: {
          workspaceId: ctx.workspace.id,
          clientId: input.clientId,
          name: input.name,
          description: input.description ?? null,
          status: input.status,
          progress: input.progress,
          startDate: input.startDate ?? null,
          dueDate: input.dueDate ?? null,
        },
      });
      return { ok: true as const, value: project };
    });

    if (!creation.ok) return creation.error;
    const project = creation.value;

    await recordActivity({
      projectId: project.id,
      type: "PROJECT_CREATED",
      ...actorOf(ctx.user),
      meta: { name: project.name },
    });

    return ActionResponse.success(project, "Project created successfully");
  },
});

export const updateProject = defineAction({
  schema: updateProjectSchema,
  guard: (input) => resolveProjectAccess(input.id),
  check: [
    can("canEditProject", "You don't have permission to edit this project."),
    writable,
    async (ctx, input) => {
      if (!input.clientId) return null;
      const clientInWorkspace = await requireClientInWorkspace(
        ctx.workspaceId,
        input.clientId,
      );
      return clientInWorkspace.ok ? null : clientInWorkspace.error;
    },
  ],
  revalidate: true,
  errors: { fallback: "Failed to update the project." },
  run: async (input, ctx): Promise<ActionResponseType<ProjectResult>> => {
    const existing = await db.project.findFirst({
      where: { id: input.id, workspaceId: ctx.workspaceId },
    });
    if (!existing) {
      return ActionResponse.failure(
        ERROR_CODES.NOT_FOUND,
        "Project not found.",
      );
    }

    const statusChanged =
      input.status !== undefined && input.status !== existing.status;
    const progressChanged =
      input.progress !== undefined && input.progress !== existing.progress;

    // Partial-update semantics: only touch fields the caller sent so a
    // narrow edit (e.g. rename only) can't wipe description or dates.
    const data: Record<string, unknown> = {};
    if (input.clientId !== undefined) data.clientId = input.clientId;
    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description;
    if (input.status !== undefined) data.status = input.status;
    if (input.progress !== undefined) data.progress = input.progress;
    if (input.startDate !== undefined) data.startDate = input.startDate;
    if (input.dueDate !== undefined) data.dueDate = input.dueDate;

    const project = await db.project.update({
      where: { id: input.id },
      data,
    });

    const actor = actorOf(ctx.user);
    if (statusChanged) {
      await recordActivity({
        projectId: project.id,
        type: "PROJECT_STATUS_CHANGED",
        ...actor,
        meta: { from: existing.status, to: project.status },
      });
    }
    if (progressChanged) {
      await recordActivity({
        projectId: project.id,
        type: "PROJECT_PROGRESS_UPDATED",
        ...actor,
        meta: { from: existing.progress, to: project.progress },
      });
    }

    return ActionResponse.success(project, "Project updated successfully");
  },
});

export const updateProjectStatus = defineAction({
  schema: updateProjectStatusSchema,
  guard: (input) => resolveProjectAccess(input.id),
  check: [
    can("canEditProject", "You don't have permission to edit this project."),
    writable,
  ],
  revalidate: true,
  errors: { fallback: "Failed to update the project status." },
  run: async (input, ctx): Promise<ActionResponseType<ProjectResult>> => {
    const existing = await db.project.findUnique({
      where: { id: input.id },
    });
    if (!existing) {
      return ActionResponse.failure(
        ERROR_CODES.NOT_FOUND,
        "Project not found.",
      );
    }

    const project = await db.project.update({
      where: { id: input.id },
      data: { status: input.status },
    });

    await recordActivity({
      projectId: project.id,
      type: "PROJECT_STATUS_CHANGED",
      ...actorOf(ctx.user),
      meta: { from: existing.status, to: project.status },
    });

    return ActionResponse.success(
      project,
      "Project status updated successfully",
    );
  },
});

export const updateProjectProgress = defineAction({
  schema: updateProjectProgressSchema,
  guard: (input) => resolveProjectAccess(input.id),
  check: [
    can("canEditProject", "You don't have permission to edit this project."),
    writable,
  ],
  revalidate: true,
  errors: { fallback: "Failed to update the project progress." },
  run: async (input, ctx): Promise<ActionResponseType<ProjectResult>> => {
    const project = await db.project.update({
      where: { id: input.id },
      data: { progress: input.progress },
    });

    await recordActivity({
      projectId: project.id,
      type: "PROJECT_PROGRESS_UPDATED",
      ...actorOf(ctx.user),
      meta: { progress: project.progress },
    });

    return ActionResponse.success(
      project,
      "Project progress updated successfully",
    );
  },
});

export const deleteProject = defineAction({
  schema: projectIdSchema,
  guard: (input) => resolveProjectAccess(input.id),
  check: [
    can(
      "canDeleteProject",
      "Only the workspace owner or an admin can delete projects.",
    ),
    writable,
  ],
  revalidate: true,
  errors: { fallback: "Failed to delete the project." },
  run: async (input, ctx): Promise<ActionResponseType<DeleteProjectResult>> => {
    const result = await db.project.deleteMany({
      where: {
        id: input.id,
        workspaceId: ctx.workspaceId,
      },
    });
    if (result.count === 0) {
      return ActionResponse.failure(
        ERROR_CODES.NOT_FOUND,
        "Project not found.",
      );
    }
    return ActionResponse.success(
      { deleted: true },
      "Project deleted successfully",
    );
  },
});
