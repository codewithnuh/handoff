"use server";

import type {
  Invoice,
  InvoiceLineItem,
} from "@/app/generated/prisma/client";
import { Prisma } from "@/app/generated/prisma/client";
import { db } from "@/lib/prisma";
import { recordActivity } from "@/lib/actions/activity";
import { revalidateDashboard } from "@/lib/actions/revalidate";
import { toActionError } from "@/lib/actions/helpers";
import { resolveProjectAccess } from "@/lib/actions/guards";
import { ERROR_CODES } from "@/lib/constants/errors";
import { assertWorkspaceWritable } from "@/lib/services/plan-limits";
import type { ActionResponseType } from "@/lib/types/action";
import { ActionResponse } from "@/lib/utils/action-response";
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  invoiceIdSchema,
  addLineItemSchema,
  removeLineItemSchema,
  convertDeliverablesSchema,
} from "@/lib/validation/invoice";
import type {
  CreateInvoiceInput,
  UpdateInvoiceInput,
  InvoiceIdInput,
  AddLineItemInput,
  RemoveLineItemInput,
  ConvertDeliverablesInput,
} from "@/lib/validation/invoice";

// ──────────────────────────────────────────────
// Result types
// ──────────────────────────────────────────────

export type InvoiceResult = Invoice;
export type InvoiceLineItemResult = InvoiceLineItem;
export type DeleteResult = { deleted: boolean };

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/** Recalculate invoice subtotal, tax, and total from line items. */
async function recalculateInvoice(invoiceId: string) {
  const lineItems = await db.invoiceLineItem.findMany({
    where: { invoiceId },
    select: { amount: true },
  });

  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    select: { taxRate: true },
  });

  if (!invoice) return;

  const subtotal = lineItems.reduce((sum, item) => sum + Number(item.amount), 0);
  const taxAmount = subtotal * (Number(invoice.taxRate) / 100);
  const total = subtotal + taxAmount;

  await db.invoice.update({
    where: { id: invoiceId },
    data: {
      subtotal: new Prisma.Decimal(subtotal.toFixed(2)),
      taxAmount: new Prisma.Decimal(taxAmount.toFixed(2)),
      amount: new Prisma.Decimal(total.toFixed(2)),
    },
  });
}

/** Generate the next invoice number for a project (INV-001, INV-002, ...). */
async function generateInvoiceNumber(projectId: string): Promise<string> {
  const lastInvoice = await db.invoice.findFirst({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    select: { invoiceNumber: true },
  });

  if (!lastInvoice) return "INV-001";

  const match = lastInvoice.invoiceNumber.match(/INV-(\d+)/);
  if (!match) return "INV-001";

  const next = parseInt(match[1], 10) + 1;
  return `INV-${String(next).padStart(3, "0")}`;
}

// ──────────────────────────────────────────────
// Invoice CRUD Actions
// ──────────────────────────────────────────────

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

  const access = await resolveProjectAccess(validated.data.projectId);
  if (!access.ok) return access.error;
  if (!access.value.canManageDeliverables) {
    return ActionResponse.failure(
      ERROR_CODES.FORBIDDEN,
      "You don't have permission to create invoices.",
    );
  }

  const readOnlyError = await assertWorkspaceWritable(access.value.workspaceId);
  if (readOnlyError) return readOnlyError;

  try {
    const invoiceNumber = await generateInvoiceNumber(validated.data.projectId);

    const invoice = await db.invoice.create({
      data: {
        projectId: validated.data.projectId,
        invoiceNumber,
        description: validated.data.description ?? null,
        taxRate: validated.data.taxRate ?? 0,
        dueDate: validated.data.dueDate ?? null,
        paymentNotes: validated.data.paymentNotes ?? null,
      },
    });

    await recordActivity({
      projectId: validated.data.projectId,
      type: "INVOICE_CREATED",
      actorUserId: access.value.user.id,
      actorEmail: access.value.user.email,
      actorName: access.value.user.name,
      meta: { invoiceNumber, invoiceId: invoice.id },
    });

    revalidateDashboard();
    return ActionResponse.success(invoice, "Invoice created");
  } catch (error) {
    return toActionError(error, { fallback: "Failed to create invoice." });
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

  try {
    const existing = await db.invoice.findUnique({
      where: { id: validated.data.id },
      select: { id: true, projectId: true, status: true },
    });
    if (!existing) {
      return ActionResponse.failure(ERROR_CODES.NOT_FOUND, "Invoice not found.");
    }

    if (existing.status !== "DRAFT") {
      return ActionResponse.failure(
        ERROR_CODES.FORBIDDEN,
        "Only draft invoices can be edited.",
      );
    }

    const access = await resolveProjectAccess(existing.projectId);
    if (!access.ok) return access.error;
    if (!access.value.canManageDeliverables) {
      return ActionResponse.failure(
        ERROR_CODES.FORBIDDEN,
        "You don't have permission to edit invoices.",
      );
    }

    const readOnlyError = await assertWorkspaceWritable(access.value.workspaceId);
    if (readOnlyError) return readOnlyError;

    const patch: Record<string, unknown> = {};
    if (validated.data.description !== undefined)
      patch.description = validated.data.description;
    if (validated.data.dueDate !== undefined)
      patch.dueDate = validated.data.dueDate;
    if (validated.data.paymentNotes !== undefined)
      patch.paymentNotes = validated.data.paymentNotes;

    const taxRateChanged = validated.data.taxRate !== undefined;
    if (taxRateChanged) {
      patch.taxRate = validated.data.taxRate;
    }

    const invoice = await db.invoice.update({
      where: { id: validated.data.id },
      data: patch,
    });

    // Recalculate if tax rate changed
    if (taxRateChanged) {
      await recalculateInvoice(validated.data.id);
    }

    revalidateDashboard();
    return ActionResponse.success(invoice, "Invoice updated");
  } catch (error) {
    return toActionError(error, { fallback: "Failed to update invoice." });
  }
};

export const deleteInvoice = async (
  data: InvoiceIdInput,
): Promise<ActionResponseType<DeleteResult>> => {
  const validated = invoiceIdSchema.safeParse(data);
  if (!validated.success) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid input",
      validated.error.flatten().fieldErrors,
    );
  }

  try {
    const existing = await db.invoice.findUnique({
      where: { id: validated.data.id },
      select: { id: true, projectId: true, status: true },
    });
    if (!existing) {
      return ActionResponse.failure(ERROR_CODES.NOT_FOUND, "Invoice not found.");
    }

    if (existing.status !== "DRAFT") {
      return ActionResponse.failure(
        ERROR_CODES.FORBIDDEN,
        "Only draft invoices can be deleted.",
      );
    }

    const access = await resolveProjectAccess(existing.projectId);
    if (!access.ok) return access.error;
    if (!access.value.canManageDeliverables) {
      return ActionResponse.failure(
        ERROR_CODES.FORBIDDEN,
        "You don't have permission to delete invoices.",
      );
    }

    const readOnlyError = await assertWorkspaceWritable(access.value.workspaceId);
    if (readOnlyError) return readOnlyError;

    await db.invoice.delete({ where: { id: validated.data.id } });
    revalidateDashboard();
    return ActionResponse.success({ deleted: true }, "Invoice deleted");
  } catch (error) {
    return toActionError(error, { fallback: "Failed to delete invoice." });
  }
};

// ──────────────────────────────────────────────
// Invoice Status Transitions
// ──────────────────────────────────────────────

export const sendInvoice = async (
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

  try {
    const existing = await db.invoice.findUnique({
      where: { id: validated.data.id },
      select: { id: true, projectId: true, status: true },
    });
    if (!existing) {
      return ActionResponse.failure(ERROR_CODES.NOT_FOUND, "Invoice not found.");
    }

    if (existing.status !== "DRAFT") {
      return ActionResponse.failure(
        ERROR_CODES.FORBIDDEN,
        "Only draft invoices can be sent.",
      );
    }

    const access = await resolveProjectAccess(existing.projectId);
    if (!access.ok) return access.error;
    if (!access.value.canManageDeliverables) {
      return ActionResponse.failure(
        ERROR_CODES.FORBIDDEN,
        "You don't have permission to send invoices.",
      );
    }

    const readOnlyError = await assertWorkspaceWritable(access.value.workspaceId);
    if (readOnlyError) return readOnlyError;

    const invoice = await db.invoice.update({
      where: { id: validated.data.id },
      data: { status: "SENT" },
    });

    await recordActivity({
      projectId: existing.projectId,
      type: "INVOICE_SENT",
      actorUserId: access.value.user.id,
      actorEmail: access.value.user.email,
      actorName: access.value.user.name,
      meta: { invoiceNumber: invoice.invoiceNumber },
    });

    revalidateDashboard();
    return ActionResponse.success(invoice, "Invoice sent");
  } catch (error) {
    return toActionError(error, { fallback: "Failed to send invoice." });
  }
};

export const markInvoicePaid = async (
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

  try {
    const existing = await db.invoice.findUnique({
      where: { id: validated.data.id },
      select: { id: true, projectId: true, status: true },
    });
    if (!existing) {
      return ActionResponse.failure(ERROR_CODES.NOT_FOUND, "Invoice not found.");
    }

    if (existing.status !== "SENT" && existing.status !== "OVERDUE") {
      return ActionResponse.failure(
        ERROR_CODES.FORBIDDEN,
        "Only sent or overdue invoices can be marked as paid.",
      );
    }

    const access = await resolveProjectAccess(existing.projectId);
    if (!access.ok) return access.error;
    if (!access.value.canManageDeliverables) {
      return ActionResponse.failure(
        ERROR_CODES.FORBIDDEN,
        "You don't have permission to mark invoices as paid.",
      );
    }

    const readOnlyError = await assertWorkspaceWritable(access.value.workspaceId);
    if (readOnlyError) return readOnlyError;

    const invoice = await db.invoice.update({
      where: { id: validated.data.id },
      data: { status: "PAID", paidAt: new Date() },
    });

    await recordActivity({
      projectId: existing.projectId,
      type: "INVOICE_PAID",
      actorUserId: access.value.user.id,
      actorEmail: access.value.user.email,
      actorName: access.value.user.name,
      meta: { invoiceNumber: invoice.invoiceNumber },
    });

    revalidateDashboard();
    return ActionResponse.success(invoice, "Invoice marked as paid");
  } catch (error) {
    return toActionError(error, {
      fallback: "Failed to mark invoice as paid.",
    });
  }
};

export const cancelInvoice = async (
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

  try {
    const existing = await db.invoice.findUnique({
      where: { id: validated.data.id },
      select: { id: true, projectId: true, status: true },
    });
    if (!existing) {
      return ActionResponse.failure(ERROR_CODES.NOT_FOUND, "Invoice not found.");
    }

    if (existing.status === "PAID" || existing.status === "CANCELLED") {
      return ActionResponse.failure(
        ERROR_CODES.FORBIDDEN,
        "Paid or cancelled invoices cannot be cancelled.",
      );
    }

    const access = await resolveProjectAccess(existing.projectId);
    if (!access.ok) return access.error;
    if (!access.value.canManageDeliverables) {
      return ActionResponse.failure(
        ERROR_CODES.FORBIDDEN,
        "You don't have permission to cancel invoices.",
      );
    }

    const readOnlyError = await assertWorkspaceWritable(access.value.workspaceId);
    if (readOnlyError) return readOnlyError;

    const invoice = await db.invoice.update({
      where: { id: validated.data.id },
      data: { status: "CANCELLED" },
    });

    revalidateDashboard();
    return ActionResponse.success(invoice, "Invoice cancelled");
  } catch (error) {
    return toActionError(error, { fallback: "Failed to cancel invoice." });
  }
};

// ──────────────────────────────────────────────
// Line Item Actions
// ──────────────────────────────────────────────

export const addLineItem = async (
  data: AddLineItemInput,
): Promise<ActionResponseType<InvoiceLineItemResult>> => {
  const validated = addLineItemSchema.safeParse(data);
  if (!validated.success) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid input",
      validated.error.flatten().fieldErrors,
    );
  }

  try {
    const invoice = await db.invoice.findUnique({
      where: { id: validated.data.invoiceId },
      select: { id: true, projectId: true, status: true },
    });
    if (!invoice) {
      return ActionResponse.failure(ERROR_CODES.NOT_FOUND, "Invoice not found.");
    }

    if (invoice.status !== "DRAFT") {
      return ActionResponse.failure(
        ERROR_CODES.FORBIDDEN,
        "Only draft invoices can have line items added.",
      );
    }

    const access = await resolveProjectAccess(invoice.projectId);
    if (!access.ok) return access.error;
    if (!access.value.canManageDeliverables) {
      return ActionResponse.failure(
        ERROR_CODES.FORBIDDEN,
        "You don't have permission to edit invoices.",
      );
    }

    const readOnlyError = await assertWorkspaceWritable(access.value.workspaceId);
    if (readOnlyError) return readOnlyError;

    const quantity = validated.data.quantity ?? 1;
    const unitPrice = parseFloat(validated.data.unitPrice);
    const amount = quantity * unitPrice;

    const lineItem = await db.invoiceLineItem.create({
      data: {
        invoiceId: validated.data.invoiceId,
        description: validated.data.description,
        quantity,
        unitPrice: new Prisma.Decimal(unitPrice.toFixed(2)),
        amount: new Prisma.Decimal(amount.toFixed(2)),
        deliverableId: validated.data.deliverableId ?? null,
      },
    });

    // Recalculate invoice totals
    await recalculateInvoice(validated.data.invoiceId);

    revalidateDashboard();
    return ActionResponse.success(lineItem, "Line item added");
  } catch (error) {
    return toActionError(error, { fallback: "Failed to add line item." });
  }
};

export const removeLineItem = async (
  data: RemoveLineItemInput,
): Promise<ActionResponseType<DeleteResult>> => {
  const validated = removeLineItemSchema.safeParse(data);
  if (!validated.success) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid input",
      validated.error.flatten().fieldErrors,
    );
  }

  try {
    const existing = await db.invoiceLineItem.findUnique({
      where: { id: validated.data.id },
      select: { id: true, invoiceId: true },
    });
    if (!existing) {
      return ActionResponse.failure(
        ERROR_CODES.NOT_FOUND,
        "Line item not found.",
      );
    }

    const invoice = await db.invoice.findUnique({
      where: { id: existing.invoiceId },
      select: { id: true, projectId: true, status: true },
    });
    if (!invoice) {
      return ActionResponse.failure(ERROR_CODES.NOT_FOUND, "Invoice not found.");
    }

    if (invoice.status !== "DRAFT") {
      return ActionResponse.failure(
        ERROR_CODES.FORBIDDEN,
        "Only draft invoices can have line items removed.",
      );
    }

    const access = await resolveProjectAccess(invoice.projectId);
    if (!access.ok) return access.error;
    if (!access.value.canManageDeliverables) {
      return ActionResponse.failure(
        ERROR_CODES.FORBIDDEN,
        "You don't have permission to edit invoices.",
      );
    }

    const readOnlyError = await assertWorkspaceWritable(access.value.workspaceId);
    if (readOnlyError) return readOnlyError;

    await db.invoiceLineItem.delete({ where: { id: validated.data.id } });

    // Recalculate invoice totals
    await recalculateInvoice(existing.invoiceId);

    revalidateDashboard();
    return ActionResponse.success({ deleted: true }, "Line item removed");
  } catch (error) {
    return toActionError(error, { fallback: "Failed to remove line item." });
  }
};

// ──────────────────────────────────────────────
// Convert Approved Deliverables to Line Items
// ──────────────────────────────────────────────

export const convertDeliverablesToLineItems = async (
  data: ConvertDeliverablesInput,
): Promise<ActionResponseType<{ converted: number }>> => {
  const validated = convertDeliverablesSchema.safeParse(data);
  if (!validated.success) {
    return ActionResponse.failure(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid input",
      validated.error.flatten().fieldErrors,
    );
  }

  try {
    const invoice = await db.invoice.findUnique({
      where: { id: validated.data.invoiceId },
      select: { id: true, projectId: true, status: true },
    });
    if (!invoice) {
      return ActionResponse.failure(ERROR_CODES.NOT_FOUND, "Invoice not found.");
    }

    if (invoice.projectId !== validated.data.projectId) {
      return ActionResponse.failure(
        ERROR_CODES.FORBIDDEN,
        "Invoice does not belong to this project.",
      );
    }

    if (invoice.status !== "DRAFT") {
      return ActionResponse.failure(
        ERROR_CODES.FORBIDDEN,
        "Only draft invoices can have deliverables converted.",
      );
    }

    const access = await resolveProjectAccess(validated.data.projectId);
    if (!access.ok) return access.error;
    if (!access.value.canManageDeliverables) {
      return ActionResponse.failure(
        ERROR_CODES.FORBIDDEN,
        "You don't have permission to edit invoices.",
      );
    }

    const readOnlyError = await assertWorkspaceWritable(access.value.workspaceId);
    if (readOnlyError) return readOnlyError;

    // Find approved deliverables that aren't already linked to a line item
    const deliverables = await db.deliverable.findMany({
      where: {
        id: { in: validated.data.deliverableIds },
        projectId: validated.data.projectId,
        status: "APPROVED",
      },
      select: {
        id: true,
        title: true,
        description: true,
      },
    });

    if (deliverables.length === 0) {
      return ActionResponse.failure(
        ERROR_CODES.VALIDATION_ERROR,
        "No approved deliverables found to convert.",
      );
    }

    // Check which deliverables already have line items on this invoice
    const existingLinks = await db.invoiceLineItem.findMany({
      where: {
        invoiceId: validated.data.invoiceId,
        deliverableId: { in: deliverables.map((d) => d.id) },
      },
      select: { deliverableId: true },
    });
    const linkedIds = new Set(existingLinks.map((l) => l.deliverableId));

    const unlinkedDeliverables = deliverables.filter(
      (d) => !linkedIds.has(d.id),
    );

    if (unlinkedDeliverables.length === 0) {
      return ActionResponse.failure(
        ERROR_CODES.VALIDATION_ERROR,
        "All selected deliverables are already linked to this invoice.",
      );
    }

    // Create line items for unlinked deliverables
    await db.invoiceLineItem.createMany({
      data: unlinkedDeliverables.map((d) => ({
        invoiceId: validated.data.invoiceId,
        description: d.title + (d.description ? ` — ${d.description}` : ""),
        quantity: 1,
        unitPrice: new Prisma.Decimal("0.00"),
        amount: new Prisma.Decimal("0.00"),
        deliverableId: d.id,
      })),
    });

    // Recalculate invoice totals
    await recalculateInvoice(validated.data.invoiceId);

    revalidateDashboard();
    return ActionResponse.success(
      { converted: unlinkedDeliverables.length },
      `${unlinkedDeliverables.length} deliverable(s) converted to line items`,
    );
  } catch (error) {
    return toActionError(error, {
      fallback: "Failed to convert deliverables.",
    });
  }
};
