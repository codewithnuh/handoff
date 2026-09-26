"use server";

import type { Client } from "@/app/generated/prisma/client";
import { db } from "@/lib/prisma";
import { defineAction, writable } from "@/lib/actions/define";
import { getVisibleProjectIds, requireWorkspacePermission } from "@/lib/access";
import { ERROR_CODES } from "@/lib/constants/errors";
import type { ActionResponseType } from "@/lib/types/action";
import { ActionResponse } from "@/lib/utils/action-response";
import {
  clientIdSchema,
  createClientSchema,
  updateClientSchema,
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

export const listClients = defineAction({
  errors: { fallback: "Failed to load clients." },
  run: async (ctx): Promise<ActionResponseType<ClientListResult>> => {
    // Members only see clients tied to their assigned projects
    const visibleIds = await getVisibleProjectIds(
      ctx.workspace.id,
      ctx.user.id,
      ctx.isAdmin,
    );

    const items = await db.client.findMany({
      where: {
        workspaceId: ctx.workspace.id,
        ...(visibleIds ? { projects: { some: { id: { in: visibleIds } } } } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    return ActionResponse.success({ items }, "Clients loaded");
  },
});

export const getClient = defineAction({
  schema: clientIdSchema,
  errors: { fallback: "Failed to load the client." },
  run: async (input, ctx): Promise<ActionResponseType<ClientResult>> => {
    const visibleIds = await getVisibleProjectIds(
      ctx.workspace.id,
      ctx.user.id,
      ctx.isAdmin,
    );

    const client = await db.client.findFirst({
      where: {
        id: input.id,
        workspaceId: ctx.workspace.id,
        ...(visibleIds
          ? { projects: { some: { id: { in: visibleIds } } } }
          : {}),
      },
    });
    if (!client) {
      return ActionResponse.failure(ERROR_CODES.NOT_FOUND, "Client not found.");
    }
    return ActionResponse.success(client, "Client loaded");
  },
});

export const createClient = defineAction({
  schema: createClientSchema,
  guard: () => requireWorkspacePermission("MANAGE_CLIENTS"),
  check: writable,
  revalidate: true,
  errors: {
    fallback: "Failed to create the client.",
    conflict: "A client with this email already exists.",
  },
  run: async (input, ctx): Promise<ActionResponseType<ClientResult>> => {
    // The client directory is workspace-wide — owner/admin or MANAGE_CLIENTS
    const client = await db.client.create({
      data: {
        workspaceId: ctx.workspace.id,
        name: input.name,
        email: input.email,
        company: input.company ?? null,
      },
    });
    return ActionResponse.success(client, "Client created successfully");
  },
});

export const updateClient = defineAction({
  schema: updateClientSchema,
  guard: () => requireWorkspacePermission("MANAGE_CLIENTS"),
  check: writable,
  revalidate: true,
  errors: {
    fallback: "Failed to update the client.",
    conflict: "A client with this email already exists.",
  },
  run: async (input, ctx): Promise<ActionResponseType<ClientResult>> => {
    const client = await db.client.updateMany({
      where: {
        id: input.id,
        workspaceId: ctx.workspace.id,
      },
      data: {
        name: input.name,
        email: input.email,
        company: input.company ?? null,
      },
    });
    if (client.count === 0) {
      return ActionResponse.failure(ERROR_CODES.NOT_FOUND, "Client not found.");
    }

    const updated = await db.client.findUnique({
      where: { id: input.id },
    });
    return ActionResponse.success(updated!, "Client updated successfully");
  },
});

export const deleteClient = defineAction({
  schema: clientIdSchema,
  guard: () => requireWorkspacePermission("MANAGE_CLIENTS"),
  check: writable,
  revalidate: true,
  errors: {
    fallback: "Failed to delete the client.",
    referenced: "This client can't be deleted because it still has projects.",
  },
  run: async (input, ctx): Promise<ActionResponseType<DeleteClientResult>> => {
    const result = await db.client.deleteMany({
      where: {
        id: input.id,
        workspaceId: ctx.workspace.id,
      },
    });
    if (result.count === 0) {
      return ActionResponse.failure(ERROR_CODES.NOT_FOUND, "Client not found.");
    }
    return ActionResponse.success(
      { deleted: true },
      "Client deleted successfully",
    );
  },
});
