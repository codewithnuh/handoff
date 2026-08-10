"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/prisma";
import { recordActivity } from "@/lib/actions/activity";
import { toActionError } from "@/lib/actions/helpers";
import {
  requireProjectInWorkspace,
  requireWorkspace,
} from "@/lib/actions/guards";
import { ERROR_CODES } from "@/lib/constants/errors";
import type { ActionResponseType } from "@/lib/types/action";
import { ActionResponse } from "@/lib/utils/action-response";
import { serializeInvoice } from "@/lib/utils/serializers";
import type { SerializedInvoice } from "@/lib/utils/serializers";
import {
  createInvoiceSchema,
  invoiceIdSchema,
  projectInvoicesSchema,
  updateInvoiceSchema,
  updateInvoiceStatusSchema,
} from "@/lib/validation/invoice";
import type {
  CreateInvoiceInput,
  InvoiceIdInput,
  ProjectInvoicesInput,
  UpdateInvoiceInput,
  UpdateInvoiceStatusInput,
} from "@/lib/validation/invoice";

// ──────────────────────────────────────────────
// Result types
// `amount` is serialized to a string so the response is JSON-safe.
// ──────────────────────────────────────────────

export type InvoiceResult = SerializedInvoice;
export type InvoiceListResult = { items: SerializedInvoice[] };
export type DeleteInvoiceResult = { deleted: boolean };

const arena = "/";

// ──────────────────────────────────────────────
// Server Actions
// ──────────────────────────────────────────────

export const listInvoices = async (
  data: ProjectInvoicesInput,
): Promise<ActionResponseType<InvoiceListResult>> => {
  const validated = projectInvoicesSchema.safeParse(data);
  if (!validated.success) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid input",
      validated.error.flatten().fieldErrors,
    );
  }

  const guard = await requireWorkspace();
  if (!guard.ok) return guard.error;

  const projectInScope = await requireProjectInWorkspace(
    guard.value.workspace.id,
    validated.data.projectId,
  );
  if (!projectInScope.ok) return projectInScope.error;

  try {
    const invoices = await db.invoice.findMany({
      where: { projectId: validated.data.projectId },
      orderBy: { createdAt: "desc" },
    });
    return ActionResponse.success(
      { items: invoices.map(serializeInvoice) },
      "Invoices loaded",
    );
  } catch (error) {
    return toActionError(error, { fallback: "Failed to load invoices." });
  }
};

export const getInvoice = async (
  data: InvoiceIdInput,
): Promise<ActionResponseType<InvoiceResult>> => {
  const validated = invoiceIdSchema.safeParse(data);
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
    const invoice = await db.invoice.findFirst({
      where: {
        id: validated.data.id,
        project: { workspaceId: guard.value.workspace.id },
      },
    });
    if (!invoice) {
      return ActionResponse.failure(
        ERROR_CODES.NOT_FOUND,
        "Invoice not found.",
      );
    }
    return ActionResponse.success(
      serializeInvoice(invoice),
      "Invoice loaded",
    );
  } catch (error) {
    return toActionError(error, { fallback: "Failed to load the invoice." });
  }
};

export const createInvoice = async (
  data: CreateInvoiceInput,
): Promise<ActionResponseType<InvoiceResult>> => {
  const validated = createInvoiceSchema.safeParse(data);
  if (!validated.success) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid input",
      validated.error.flatten().fieldErrors,
    );
  }

  const guard = await requireWorkspace();
  if (!guard.ok) return guard.error;

  const projectInScope = await requireProjectInWorkspace(
    guard.value.workspace.id,
    validated.data.projectId,
  );
  if (!projectInScope.ok) return projectInScope.error;

  try {
    const invoice = await db.invoice.create({
      data: {
        projectId: validated.data.projectId,
        invoiceNumber: validated.data.invoiceNumber,
        description: validated.data.description ?? null,
        amount: validated.data.amount,
        currency: validated.data.currency ?? "USD",
        dueDate: validated.data.dueDate ?? null,
      },
    });

    await recordActivity({
      projectId: validated.data.projectId,
      type: "INVOICE_CREATED",
      actorUserId: guard.value.user.id,
      actorEmail: guard.value.user.email,
      actorName: guard.value.user.name,
      meta: { invoiceNumber: invoice.invoiceNumber },
    });

    revalidatePath(arena);
    return ActionResponse.success(
      serializeInvoice(invoice),
      "Invoice created successfully",
    );
  } catch (error) {
    return toActionError(error, {
      fallback: "Failed to create the invoice.",
      conflict: "An invoice with this number already exists for the project.",
    });
  }
};

export const updateInvoice = async (
  data: UpdateInvoiceInput,
): Promise<ActionResponseType<InvoiceResult>> => {
  const validated = updateInvoiceSchema.safeParse(data);
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
    const invoice = await db.invoice.findFirst({
      where: {
        id: validated.data.id,
        project: { workspaceId: guard.value.workspace.id },
      },
      select: { id: true },
    });
    if (!invoice) {
      return ActionResponse.failure(
        ERROR_CODES.NOT_FOUND,
        "Invoice not found.",
      );
    }

    const updated = await db.invoice.update({
      where: { id: validated.data.id },
      data: {
        invoiceNumber: validated.data.invoiceNumber,
        description: validated.data.description ?? null,
        amount: validated.data.amount,
        currency: validated.data.currency,
        dueDate: validated.data.dueDate ?? null,
      },
    });

    revalidatePath(arena);
    return ActionResponse.success(
      serializeInvoice(updated),
      "Invoice updated successfully",
    );
  } catch (error) {
    return toActionError(error, {
      fallback: "Failed to update the invoice.",
      conflict: "An invoice with this number already exists for the project.",
    });
  }
};


export const updateInvoiceStatus = async (
  data: UpdateInvoiceStatusInput,
): Promise<ActionResponseType<InvoiceResult>> => {
  const validated = updateInvoiceStatusSchema.safeParse(data);
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
    const existing = await db.invoice.findFirst({
      where: {
        id: validated.data.id,
        project: { workspaceId: guard.value.workspace.id },
      },
    });
    if (!existing) {
      return ActionResponse.failure(
        ERROR_CODES.NOT_FOUND,
        "Invoice not found.",
      );
    }

    const invoice = await db.invoice.update({
      where: { id: validated.data.id },
      data: { status: validated.data.status },
    });

    const activityType =
      invoice.status === "SENT"
        ? ("INVOICE_SENT" as const)
        : invoice.status === "PAID"
          ? ("INVOICE_PAID" as const)
          : null;

    if (activityType) {
      await recordActivity({
        projectId: invoice.projectId,
        type: activityType,
        actorUserId: guard.value.user.id,
        actorEmail: guard.value.user.email,
        actorName: guard.value.user.name,
        meta: { from: existing.status, to: invoice.status },
      });
    }

    revalidatePath(arena);
    return ActionResponse.success(
      serializeInvoice(invoice),
      "Invoice status updated successfully",
    );
  } catch (error) {
    return toActionError(error, {
      fallback: "Failed to update the invoice status.",
    });
  }
};

export const deleteInvoice = async (
  data: InvoiceIdInput,
): Promise<ActionResponseType<DeleteInvoiceResult>> => {
  const validated = invoiceIdSchema.safeParse(data);
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
    const invoice = await db.invoice.findFirst({
      where: {
        id: validated.data.id,
        project: { workspaceId: guard.value.workspace.id },
      },
      select: { id: true },
    });
    if (!invoice) {
      return ActionResponse.failure(
        ERROR_CODES.NOT_FOUND,
        "Invoice not found.",
      );
    }

    await db.invoice.delete({ where: { id: validated.data.id } });
    revalidatePath(arena);
    return ActionResponse.success(
      { deleted: true },
      "Invoice deleted successfully",
    );
  } catch (error) {
    return toActionError(error, { fallback: "Failed to delete the invoice." });
  }
};

