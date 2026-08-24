"use server";

import type { Project } from "@/app/generated/prisma/client";
import { db } from "@/lib/prisma";
import { recordActivity } from "@/lib/actions/activity";
import { toActionError } from "@/lib/actions/helpers";
import { revalidateDashboard } from "@/lib/actions/revalidate";
import {
  requireClientInWorkspace,
  requireProjectInWorkspace,
  requireWorkspace,
} from "@/lib/actions/guards";
import { ERROR_CODES } from "@/lib/constants/errors";
import { assertCanCreateProject, assertWorkspaceWritable } from "@/lib/services/plan-limits";
import type { ActionResponseType } from "@/lib/types/action";
import { ActionResponse } from "@/lib/utils/action-response";
import {
  createProjectSchema,
  projectIdSchema,
  updateProjectProgressSchema,
  updateProjectSchema,
  updateProjectStatusSchema,
} from "@/lib/validation/project";
import type {
  CreateProjectInput,
  ProjectIdInput,
  UpdateProjectInput,
  UpdateProjectProgressInput,
  UpdateProjectStatusInput,
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
export const listProjects = async (): Promise<
  ActionResponseType<ProjectListResult>
> => {
  const guard = await requireWorkspace();
  if (!guard.ok) return guard.error;

  try {
    const items = await db.project.findMany({
      where: { workspaceId: guard.value.workspace.id },
      orderBy: { createdAt: "desc" },
    });
    return ActionResponse.success({ items }, "Projects loaded");
  } catch (error) {
    return toActionError(error, { fallback: "Failed to load projects." });
  }
};

export const getProject = async (
  data: ProjectIdInput,
): Promise<ActionResponseType<ProjectResult>> => {
  const validated = projectIdSchema.safeParse(data);
  if (!validated.success) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid input",
      validated.error.flatten().fieldErrors,
    );
  }

  const guard = await requireWorkspace();
  if (!guard.ok) return guard.error;

  try {
    const project = await db.project.findFirst({
      where: {
        id: validated.data.id,
        workspaceId: guard.value.workspace.id,
      },
    });
    if (!project) {
      return ActionResponse.failure(
        ERROR_CODES.NOT_FOUND,
        "Project not found.",
      );
    }
    return ActionResponse.success(project, "Project loaded");
  } catch (error) {
    return toActionError(error, { fallback: "Failed to load the project." });
  }
};

export const createProject = async (
  data: CreateProjectInput,
): Promise<ActionResponseType<ProjectResult>> => {
  const validated = createProjectSchema.safeParse(data);
  if (!validated.success) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid input",
      validated.error.flatten().fieldErrors,
    );
  }

  const guard = await requireWorkspace();
  if (!guard.ok) return guard.error;

  const clientInWorkspace = await requireClientInWorkspace(
    guard.value.workspace.id,
    validated.data.clientId,
  );
  if (!clientInWorkspace.ok) return clientInWorkspace.error;

  // 1. Enforce per-workspace project limit
  const limitCheck = await assertCanCreateProject(guard.value.workspace.id);
  if (!limitCheck.ok) return limitCheck.error;

  // 2. Check read-only mode (downgrade grace period expired)
  const readOnlyError = await assertWorkspaceWritable(guard.value.workspace.id);
  if (readOnlyError) return readOnlyError;

  try {
    const project = await db.project.create({
      data: {
        workspaceId: guard.value.workspace.id,
        clientId: validated.data.clientId,
        name: validated.data.name,
        description: validated.data.description ?? null,
        status: validated.data.status,
        progress: validated.data.progress,
        startDate: validated.data.startDate ?? null,
        dueDate: validated.data.dueDate ?? null,
      },
    });

    await recordActivity({
      projectId: project.id,
      type: "PROJECT_CREATED",
      actorUserId: guard.value.user.id,
      actorEmail: guard.value.user.email,
      actorName: guard.value.user.name,
      meta: { name: project.name },
    });

    revalidateDashboard();
    return ActionResponse.success(project, "Project created successfully");
  } catch (error) {
    return toActionError(error, { fallback: "Failed to create the project." });
  }
};

export const updateProject = async (
  data: UpdateProjectInput,
): Promise<ActionResponseType<ProjectResult>> => {
  const validated = updateProjectSchema.safeParse(data);
  if (!validated.success) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid input",
      validated.error.flatten().fieldErrors,
    );
  }

  const guard = await requireWorkspace();
  if (!guard.ok) return guard.error;

  const readOnlyError = await assertWorkspaceWritable(guard.value.workspace.id);
  if (readOnlyError) return readOnlyError;

  const projectInWorkspace = await requireProjectInWorkspace(
    guard.value.workspace.id,
    validated.data.id,
  );
  if (!projectInWorkspace.ok) return projectInWorkspace.error;

  if (validated.data.clientId) {
    const clientInWorkspace = await requireClientInWorkspace(
      guard.value.workspace.id,
      validated.data.clientId,
    );
    if (!clientInWorkspace.ok) return clientInWorkspace.error;
  }

  try {
    const existing = await db.project.findFirst({
      where: { id: validated.data.id, workspaceId: guard.value.workspace.id },
    });
    if (!existing) {
      return ActionResponse.failure(
        ERROR_CODES.NOT_FOUND,
        "Project not found.",
      );
    }

    const statusChanged =
      validated.data.status !== undefined &&
      validated.data.status !== existing.status;
    const progressChanged =
      validated.data.progress !== undefined &&
      validated.data.progress !== existing.progress;

    // Partial-update semantics: only touch fields the caller sent so a
    // narrow edit (e.g. rename only) can't wipe description or dates.
    const data: Record<string, unknown> = {};
    if (validated.data.clientId !== undefined)
      data.clientId = validated.data.clientId;
    if (validated.data.name !== undefined) data.name = validated.data.name;
    if (validated.data.description !== undefined)
      data.description = validated.data.description;
    if (validated.data.status !== undefined) data.status = validated.data.status;
    if (validated.data.progress !== undefined)
      data.progress = validated.data.progress;
    if (validated.data.startDate !== undefined)
      data.startDate = validated.data.startDate;
    if (validated.data.dueDate !== undefined)
      data.dueDate = validated.data.dueDate;

    const project = await db.project.update({
      where: { id: validated.data.id },
      data,
    });

    const actor = {
      actorUserId: guard.value.user.id,
      actorEmail: guard.value.user.email,
      actorName: guard.value.user.name,
    };
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

    revalidateDashboard();
    return ActionResponse.success(project, "Project updated successfully");
  } catch (error) {
    return toActionError(error, { fallback: "Failed to update the project." });
  }
};

export const updateProjectStatus = async (
  data: UpdateProjectStatusInput,
): Promise<ActionResponseType<ProjectResult>> => {
  const validated = updateProjectStatusSchema.safeParse(data);
  if (!validated.success) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid input",
      validated.error.flatten().fieldErrors,
    );
  }

  const guard = await requireWorkspace();
  if (!guard.ok) return guard.error;

  const readOnlyError = await assertWorkspaceWritable(guard.value.workspace.id);
  if (readOnlyError) return readOnlyError;

  const projectInWorkspace = await requireProjectInWorkspace(
    guard.value.workspace.id,
    validated.data.id,
  );
  if (!projectInWorkspace.ok) return projectInWorkspace.error;

  try {
    const existing = await db.project.findUnique({
      where: { id: validated.data.id },
    });
    if (!existing) {
      return ActionResponse.failure(
        ERROR_CODES.NOT_FOUND,
        "Project not found.",
      );
    }

    const project = await db.project.update({
      where: { id: validated.data.id },
      data: { status: validated.data.status },
    });

    await recordActivity({
      projectId: project.id,
      type: "PROJECT_STATUS_CHANGED",
      actorUserId: guard.value.user.id,
      actorEmail: guard.value.user.email,
      actorName: guard.value.user.name,
      meta: { from: existing.status, to: project.status },
    });

    revalidateDashboard();
    return ActionResponse.success(
      project,
      "Project status updated successfully",
    );
  } catch (error) {
    return toActionError(error, {
      fallback: "Failed to update the project status.",
    });
  }
};

export const updateProjectProgress = async (
  data: UpdateProjectProgressInput,
): Promise<ActionResponseType<ProjectResult>> => {
  const validated = updateProjectProgressSchema.safeParse(data);
  if (!validated.success) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid input",
      validated.error.flatten().fieldErrors,
    );
  }

  const guard = await requireWorkspace();
  if (!guard.ok) return guard.error;

  const readOnlyError = await assertWorkspaceWritable(guard.value.workspace.id);
  if (readOnlyError) return readOnlyError;

  const projectInWorkspace = await requireProjectInWorkspace(
    guard.value.workspace.id,
    validated.data.id,
  );
  if (!projectInWorkspace.ok) return projectInWorkspace.error;

  try {
    const project = await db.project.update({
      where: { id: validated.data.id },
      data: { progress: validated.data.progress },
    });

    await recordActivity({
      projectId: project.id,
      type: "PROJECT_PROGRESS_UPDATED",
      actorUserId: guard.value.user.id,
      actorEmail: guard.value.user.email,
      actorName: guard.value.user.name,
      meta: { progress: project.progress },
    });

    revalidateDashboard();
    return ActionResponse.success(
      project,
      "Project progress updated successfully",
    );
  } catch (error) {
    return toActionError(error, {
      fallback: "Failed to update the project progress.",
    });
  }
};

export const deleteProject = async (
  data: ProjectIdInput,
): Promise<ActionResponseType<DeleteProjectResult>> => {
  const validated = projectIdSchema.safeParse(data);
  if (!validated.success) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid input",
      validated.error.flatten().fieldErrors,
    );
  }

  const guard = await requireWorkspace();
  if (!guard.ok) return guard.error;

  const readOnlyError = await assertWorkspaceWritable(guard.value.workspace.id);
  if (readOnlyError) return readOnlyError;

  try {
    const result = await db.project.deleteMany({
      where: {
        id: validated.data.id,
        workspaceId: guard.value.workspace.id,
      },
    });
    if (result.count === 0) {
      return ActionResponse.failure(
        ERROR_CODES.NOT_FOUND,
        "Project not found.",
      );
    }
    revalidateDashboard();
    return ActionResponse.success(
      { deleted: true },
      "Project deleted successfully",
    );
  } catch (error) {
    return toActionError(error, { fallback: "Failed to delete the project." });
  }
};
