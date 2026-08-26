"use server";

import type { Client } from "@/app/generated/prisma/client";
import { db } from "@/lib/prisma";
import { revalidateDashboard } from "@/lib/actions/revalidate";
import { toActionError } from "@/lib/actions/helpers";
import {
  getVisibleProjectIds,
  requireWorkspace,
  requireWorkspaceAdmin,
} from "@/lib/actions/guards";
import { assertWorkspaceWritable } from "@/lib/services/plan-limits";
import { ERROR_CODES } from "@/lib/constants/errors";
import type { ActionResponseType } from "@/lib/types/action";
import { ActionResponse } from "@/lib/utils/action-response";
import {
  clientIdSchema,
  createClientSchema,
  updateClientSchema,
} from "@/lib/validation/client";
import type {
  ClientIdInput,
  CreateClientInput,
  UpdateClientInput,
} from "@/lib/validation/client";

// ──────────────────────────────────────────────
// Result types
// ──────────────────────────────────────────────

export type ClientResult = Client;
export type ClientListResult = { items: Client[] };
export type DeleteClientResult = { deleted: boolean };

// ──────────────────────────────────────────────
// Server Actions
// ──────────────────────────────────────────────

export const listClients = async (): Promise<
  ActionResponseType<ClientListResult>
> => {
  const guard = await requireWorkspace();
  if (!guard.ok) return guard.error;

  // Members only see clients tied to their assigned projects
  const visibleIds = await getVisibleProjectIds(
    guard.value.workspace.id,
    guard.value.user.id,
    guard.value.isAdmin,
  );

  try {
    const items = await db.client.findMany({
      where: {
        workspaceId: guard.value.workspace.id,
        ...(visibleIds ? { projects: { some: { id: { in: visibleIds } } } } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    return ActionResponse.success({ items }, "Clients loaded");
  } catch (error) {
    return toActionError(error, { fallback: "Failed to load clients." });
  }
};

export const getClient = async (
  data: ClientIdInput,
): Promise<ActionResponseType<ClientResult>> => {
  const validated = clientIdSchema.safeParse(data);
  if (!validated.success) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid input",
      validated.error.flatten().fieldErrors,
    );
  }

  const guard = await requireWorkspace();
  if (!guard.ok) return guard.error;

  const visibleIds = await getVisibleProjectIds(
    guard.value.workspace.id,
    guard.value.user.id,
    guard.value.isAdmin,
  );

  try {
    const client = await db.client.findFirst({
      where: {
        id: validated.data.id,
        workspaceId: guard.value.workspace.id,
        ...(visibleIds
          ? { projects: { some: { id: { in: visibleIds } } } }
          : {}),
      },
    });
    if (!client) {
      return ActionResponse.failure(
        ERROR_CODES.NOT_FOUND,
        "Client not found.",
      );
    }
    return ActionResponse.success(client, "Client loaded");
  } catch (error) {
    return toActionError(error, { fallback: "Failed to load the client." });
  }
};

export const createClient = async (
  data: CreateClientInput,
): Promise<ActionResponseType<ClientResult>> => {
  const validated = createClientSchema.safeParse(data);
  if (!validated.success) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid input",
      validated.error.flatten().fieldErrors,
    );
  }

  // The client directory is workspace-wide — owner/admin manage it
  const guard = await requireWorkspaceAdmin();
  if (!guard.ok) return guard.error;

  const readOnlyError = await assertWorkspaceWritable(guard.value.workspace.id);
  if (readOnlyError) return readOnlyError;

  try {
    const client = await db.client.create({
      data: {
        workspaceId: guard.value.workspace.id,
        name: validated.data.name,
        email: validated.data.email,
        company: validated.data.company ?? null,
      },
    });
    revalidateDashboard();
    return ActionResponse.success(client, "Client created successfully");
  } catch (error) {
    return toActionError(error, {
      fallback: "Failed to create the client.",
      conflict: "A client with this email already exists.",
    });
  }
};

export const updateClient = async (
  data: UpdateClientInput,
): Promise<ActionResponseType<ClientResult>> => {
  const validated = updateClientSchema.safeParse(data);
  if (!validated.success) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid input",
      validated.error.flatten().fieldErrors,
    );
  }

  const guard = await requireWorkspaceAdmin();
  if (!guard.ok) return guard.error;

  const readOnlyError = await assertWorkspaceWritable(guard.value.workspace.id);
  if (readOnlyError) return readOnlyError;

  try {
    const client = await db.client.updateMany({
      where: {
        id: validated.data.id,
        workspaceId: guard.value.workspace.id,
      },
      data: {
        name: validated.data.name,
        email: validated.data.email,
        company: validated.data.company ?? null,
      },
    });
    if (client.count === 0) {
      return ActionResponse.failure(
        ERROR_CODES.NOT_FOUND,
        "Client not found.",
      );
    }

    const updated = await db.client.findUnique({
      where: { id: validated.data.id },
    });
    revalidateDashboard();
    return ActionResponse.success(
      updated!,
      "Client updated successfully",
    );
  } catch (error) {
    return toActionError(error, {
      fallback: "Failed to update the client.",
      conflict: "A client with this email already exists.",
    });
  }
};

export const deleteClient = async (
  data: ClientIdInput,
): Promise<ActionResponseType<DeleteClientResult>> => {
  const validated = clientIdSchema.safeParse(data);
  if (!validated.success) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid input",
      validated.error.flatten().fieldErrors,
    );
  }

  const guard = await requireWorkspaceAdmin();
  if (!guard.ok) return guard.error;

  const readOnlyError = await assertWorkspaceWritable(guard.value.workspace.id);
  if (readOnlyError) return readOnlyError;

  try {
    const result = await db.client.deleteMany({
      where: {
        id: validated.data.id,
        workspaceId: guard.value.workspace.id,
      },
    });
    if (result.count === 0) {
      return ActionResponse.failure(
        ERROR_CODES.NOT_FOUND,
        "Client not found.",
      );
    }
    revalidateDashboard();
    return ActionResponse.success(
      { deleted: true },
      "Client deleted successfully",
    );
  } catch (error) {
    return toActionError(error, {
      fallback: "Failed to delete the client.",
      referenced: "This client can't be deleted because it still has projects.",
    });
  }
};
