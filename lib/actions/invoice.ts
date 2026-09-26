"use server";

import type {
  Invoice,
  InvoiceLineItem,
} from "@/app/generated/prisma/client";
import { db } from "@/lib/prisma";
import { actorOf, recordActivity } from "@/lib/actions/activity";
import { can, defineAction, writable } from "@/lib/actions/define";
import { resolveProjectAccess } from "@/lib/access";
import { ERROR_CODES } from "@/lib/constants/errors";
import {
  createInvoiceWithNumber,
  recalculateInvoice,
  toDecimal,
} from "@/lib/invoice/money";
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

// ──────────────────────────────────────────────
// Result types
// ──────────────────────────────────────────────

export type InvoiceResult = Invoice;
export type InvoiceLineItemResult = InvoiceLineItem;
export type DeleteResult = { deleted: boolean };

// ──────────────────────────────────────────────
// Invoice CRUD Actions
// ──────────────────────────────────────────────

export const createInvoice = defineAction({
  schema: createInvoiceSchema,
  guard: (input) => resolveProjectAccess(input.projectId),
  check: [
    can(
      "canManageDeliverables",
      "You don't have permission to create invoices.",
    ),
    writable,
  ],
  revalidate: true,
  errors: { fallback: "Failed to create invoice." },
  run: async (input, ctx): Promise<ActionResponseType<InvoiceResult>> => {
    const invoice = await createInvoiceWithNumber(
      input.projectId,
      {
        description: input.description ?? null,
        currency: input.currency ?? "USD",
        taxRate: input.taxRate ?? 0,
        discount: input.discount ?? 0,
        dueDate: input.dueDate ?? null,
        paymentNotes: input.paymentNotes ?? null,
        senderName: input.senderName ?? null,
        senderEmail: input.senderEmail ?? null,
        senderAddress: input.senderAddress ?? undefined,
        senderTaxId: input.senderTaxId ?? null,
        clientName: input.clientName ?? null,
        clientEmail: input.clientEmail ?? null,
        clientAddress: input.clientAddress ?? undefined,
        clientTaxId: input.clientTaxId ?? null,
      },
      input.lineItems?.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })) ?? [],
    );

    await recordActivity({
      projectId: input.projectId,
      type: "INVOICE_CREATED",
      ...actorOf(ctx.user),
      meta: { invoiceNumber: invoice.invoiceNumber, invoiceId: invoice.id },
    });

    return ActionResponse.success(invoice, "Invoice created");
  },
});

export const updateInvoice = defineAction({
  schema: updateInvoiceSchema,
  guard: null,
  revalidate: true,
  errors: { fallback: "Failed to update invoice." },
  run: async (input): Promise<ActionResponseType<InvoiceResult>> => {
    const existing = await db.invoice.findUnique({
      where: { id: input.id },
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
    if (input.description !== undefined)
      patch.description = input.description;
    if (input.dueDate !== undefined)
      patch.dueDate = input.dueDate;
    if (input.paymentNotes !== undefined)
      patch.paymentNotes = input.paymentNotes;

    const taxRateChanged = input.taxRate !== undefined;
    if (taxRateChanged) {
      patch.taxRate = input.taxRate;
    }

    const discountChanged = input.discount !== undefined;
    if (discountChanged) {
      patch.discount = input.discount;
    }

    const invoice = await db.invoice.update({
      where: { id: input.id },
      data: patch,
    });

    // Recalculate if tax rate or discount changed
    if (taxRateChanged || discountChanged) {
      await recalculateInvoice(input.id);
    }

    return ActionResponse.success(invoice, "Invoice updated");
  },
});

export const deleteInvoice = defineAction({
  schema: invoiceIdSchema,
  guard: null,
  revalidate: true,
  errors: { fallback: "Failed to delete invoice." },
  run: async (input): Promise<ActionResponseType<DeleteResult>> => {
    const existing = await db.invoice.findUnique({
      where: { id: input.id },
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

    await db.invoice.delete({ where: { id: input.id } });
    return ActionResponse.success({ deleted: true }, "Invoice deleted");
  },
});

// ──────────────────────────────────────────────
// Invoice Status Transitions
// ──────────────────────────────────────────────

export const sendInvoice = defineAction({
  schema: invoiceIdSchema,
  guard: null,
  revalidate: true,
  errors: { fallback: "Failed to send invoice." },
  run: async (input): Promise<ActionResponseType<InvoiceResult>> => {
    const existing = await db.invoice.findUnique({
      where: { id: input.id },
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
      where: { id: input.id },
      data: { status: "SENT" },
    });

    await recordActivity({
      projectId: existing.projectId,
      type: "INVOICE_SENT",
      ...actorOf(access.value.user),
      meta: { invoiceNumber: invoice.invoiceNumber },
    });

    return ActionResponse.success(invoice, "Invoice sent");
  },
});

export const markInvoicePaid = defineAction({
  schema: invoiceIdSchema,
  guard: null,
  revalidate: true,
  errors: { fallback: "Failed to mark invoice as paid." },
  run: async (input): Promise<ActionResponseType<InvoiceResult>> => {
    const existing = await db.invoice.findUnique({
      where: { id: input.id },
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
      where: { id: input.id },
      data: { status: "PAID", paidAt: new Date() },
    });

    await recordActivity({
      projectId: existing.projectId,
      type: "INVOICE_PAID",
      ...actorOf(access.value.user),
      meta: { invoiceNumber: invoice.invoiceNumber },
    });

    return ActionResponse.success(invoice, "Invoice marked as paid");
  },
});

export const cancelInvoice = defineAction({
  schema: invoiceIdSchema,
  guard: null,
  revalidate: true,
  errors: { fallback: "Failed to cancel invoice." },
  run: async (input): Promise<ActionResponseType<InvoiceResult>> => {
    const existing = await db.invoice.findUnique({
      where: { id: input.id },
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
      where: { id: input.id },
      data: { status: "CANCELLED" },
    });

    return ActionResponse.success(invoice, "Invoice cancelled");
  },
});

// ──────────────────────────────────────────────
// Line Item Actions
// ──────────────────────────────────────────────

export const addLineItem = defineAction({
  schema: addLineItemSchema,
  guard: null,
  revalidate: true,
  errors: { fallback: "Failed to add line item." },
  run: async (input): Promise<ActionResponseType<InvoiceLineItemResult>> => {
    const invoice = await db.invoice.findUnique({
      where: { id: input.invoiceId },
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

    const quantity = input.quantity ?? 1;
    const unitPrice = parseFloat(input.unitPrice);
    const amount = quantity * unitPrice;

    const lineItem = await db.invoiceLineItem.create({
      data: {
        invoiceId: input.invoiceId,
        description: input.description,
        quantity,
        unitPrice: toDecimal(unitPrice),
        amount: toDecimal(amount),
        deliverableId: input.deliverableId ?? null,
      },
    });

    // Recalculate invoice totals
    await recalculateInvoice(input.invoiceId);

    return ActionResponse.success(lineItem, "Line item added");
  },
});

export const removeLineItem = defineAction({
  schema: removeLineItemSchema,
  guard: null,
  revalidate: true,
  errors: { fallback: "Failed to remove line item." },
  run: async (input): Promise<ActionResponseType<DeleteResult>> => {
    const existing = await db.invoiceLineItem.findUnique({
      where: { id: input.id },
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

    await db.invoiceLineItem.delete({ where: { id: input.id } });

    // Recalculate invoice totals
    await recalculateInvoice(existing.invoiceId);

    return ActionResponse.success({ deleted: true }, "Line item removed");
  },
});

// ──────────────────────────────────────────────
// Convert Approved Deliverables to Line Items
// ──────────────────────────────────────────────

export const convertDeliverablesToLineItems = defineAction({
  schema: convertDeliverablesSchema,
  guard: null,
  revalidate: true,
  errors: { fallback: "Failed to convert deliverables." },
  run: async (input): Promise<ActionResponseType<{ converted: number }>> => {
    const invoice = await db.invoice.findUnique({
      where: { id: input.invoiceId },
      select: { id: true, projectId: true, status: true },
    });
    if (!invoice) {
      return ActionResponse.failure(ERROR_CODES.NOT_FOUND, "Invoice not found.");
    }

    if (invoice.projectId !== input.projectId) {
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

    const access = await resolveProjectAccess(input.projectId);
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
        id: { in: input.deliverableIds },
        projectId: input.projectId,
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
        invoiceId: input.invoiceId,
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
        invoiceId: input.invoiceId,
        description: d.title + (d.description ? ` — ${d.description}` : ""),
        quantity: 1,
        unitPrice: toDecimal(0),
        amount: toDecimal(0),
        deliverableId: d.id,
      })),
    });

    // Recalculate invoice totals
    await recalculateInvoice(input.invoiceId);

    return ActionResponse.success(
      { converted: unlinkedDeliverables.length },
      `${unlinkedDeliverables.length} deliverable(s) converted to line items`,
    );
  },
});
