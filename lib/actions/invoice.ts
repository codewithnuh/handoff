"use server";

import type {
  Invoice,
  InvoiceLineItem,
} from "@/app/generated/prisma/client";
import { db } from "@/lib/prisma";
import { actorOf } from "@/lib/actions/activity";
import { can, defineAction, writable } from "@/lib/actions/define";
import { resolveProjectAccess } from "@/lib/access";
import { ERROR_CODES } from "@/lib/constants/errors";
import {
  createInvoiceWithNumber,
  withDraftInvoice,
  withLockedInvoice,
  recalculateInvoiceInTransaction,
  toDecimal,
  toQuantityDecimal,
} from "@/lib/invoice/money";
import {
  computeLineAmount,
  computeLineAmountMinor,
  hasAtMostDecimalPlaces,
  INVOICE_CURRENCIES,
  MAX_INVOICE_AMOUNT,
  toScaledInteger,
  type InvoiceCurrency,
} from "@/lib/invoice/totals";
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
      actorOf(ctx.user),
    );

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
      select: { id: true, projectId: true, status: true, currency: true },
    });
    if (!existing) {
      return ActionResponse.failure(ERROR_CODES.NOT_FOUND, "Invoice not found.");
    }

    if (existing.status !== "DRAFT") {
      return ActionResponse.failure(
        ERROR_CODES.CONFLICT,
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

    const result = await withDraftInvoice(input.id, async (tx, locked) => {
      const precision = INVOICE_CURRENCIES[locked.currency as InvoiceCurrency];
      if (precision === undefined && (taxRateChanged || discountChanged)) return "UNSUPPORTED_CURRENCY" as const;
      if (discountChanged && !hasAtMostDecimalPlaces(input.discount!, precision)) return "CURRENCY_PRECISION" as const;
      if (taxRateChanged || discountChanged) {
        const items = await tx.invoiceLineItem.findMany({
          where: { invoiceId: locked.id }, select: { amount: true },
        });
        const subtotal = items.reduce((sum, item) => sum + toScaledInteger(String(item.amount), precision), BigInt(0));
        const nextDiscount = input.discount ?? Number(locked.discount);
        if (toScaledInteger(nextDiscount, precision) > subtotal) return "DISCOUNT_EXCEEDS_SUBTOTAL" as const;
      }

      await tx.invoice.update({ where: { id: locked.id }, data: patch });
      if (taxRateChanged || discountChanged) {
        const totalsUpdated = await recalculateInvoiceInTransaction(tx, locked.id);
        if (!totalsUpdated) throw new Error("Invoice totals could not be recalculated.");
      }
      return tx.invoice.findUniqueOrThrow({ where: { id: locked.id } });
    });

    if (result.kind === "MISSING") return ActionResponse.failure(ERROR_CODES.NOT_FOUND, "Invoice not found.");
    if (result.kind === "NOT_DRAFT") return ActionResponse.failure(ERROR_CODES.CONFLICT, "Invoice is no longer a draft. Refresh and try again.");
    if (result.value === "UNSUPPORTED_CURRENCY") return ActionResponse.failure(ERROR_CODES.VALIDATION_ERROR, `Currency ${existing.currency} is no longer supported for money changes.`);
    if (result.value === "CURRENCY_PRECISION") return ActionResponse.failure(ERROR_CODES.VALIDATION_ERROR, `${existing.currency} invoices do not support fractional discounts.`);
    if (result.value === "DISCOUNT_EXCEEDS_SUBTOTAL") return ActionResponse.failure(ERROR_CODES.VALIDATION_ERROR, "Discount cannot exceed the invoice subtotal.");
    return ActionResponse.success(result.value, "Invoice updated");
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
        ERROR_CODES.CONFLICT,
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

    const result = await withDraftInvoice(input.id, async (tx, locked) => {
      await tx.invoice.delete({ where: { id: locked.id } });
      return { deleted: true };
    });
    if (result.kind === "MISSING") return ActionResponse.failure(ERROR_CODES.NOT_FOUND, "Invoice not found.");
    if (result.kind === "NOT_DRAFT") return ActionResponse.failure(ERROR_CODES.CONFLICT, "Only draft invoices can be deleted.");
    return ActionResponse.success(result.value, "Invoice deleted");
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
        ERROR_CODES.CONFLICT,
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

    const result = await withLockedInvoice(input.id, async (tx, locked) => {
      if (!locked) return { kind: "MISSING" as const };
      if (locked.status !== "DRAFT") return { kind: "INVALID" as const };
      const invoice = await tx.invoice.update({ where: { id: locked.id }, data: { status: "SENT" } });
      await tx.activity.create({
        data: {
          projectId: locked.projectId,
          type: "INVOICE_SENT",
          ...actorOf(access.value.user),
          meta: { invoiceNumber: invoice.invoiceNumber },
        },
      });
      return { kind: "OK" as const, invoice };
    });
    if (result.kind === "MISSING") return ActionResponse.failure(ERROR_CODES.NOT_FOUND, "Invoice not found.");
    if (result.kind === "INVALID") return ActionResponse.failure(ERROR_CODES.CONFLICT, "Only a draft invoice can be sent.");
    return ActionResponse.success(result.invoice, "Invoice sent");
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
        ERROR_CODES.CONFLICT,
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

    const result = await withLockedInvoice(input.id, async (tx, locked) => {
      if (!locked) return { kind: "MISSING" as const };
      if (locked.status !== "SENT" && locked.status !== "OVERDUE") return { kind: "INVALID" as const };
      const invoice = await tx.invoice.update({
        where: { id: locked.id }, data: { status: "PAID", paidAt: new Date() },
      });
      await tx.activity.create({
        data: {
          projectId: locked.projectId,
          type: "INVOICE_PAID",
          ...actorOf(access.value.user),
          meta: { invoiceNumber: invoice.invoiceNumber },
        },
      });
      return { kind: "OK" as const, invoice };
    });
    if (result.kind === "MISSING") return ActionResponse.failure(ERROR_CODES.NOT_FOUND, "Invoice not found.");
    if (result.kind === "INVALID") return ActionResponse.failure(ERROR_CODES.CONFLICT, "Only sent or overdue invoices can be marked as paid.");
    return ActionResponse.success(result.invoice, "Invoice marked as paid");
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
        ERROR_CODES.CONFLICT,
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

    const result = await withLockedInvoice(input.id, async (tx, locked) => {
      if (!locked) return { kind: "MISSING" as const };
      if (locked.status === "PAID" || locked.status === "CANCELLED") return { kind: "INVALID" as const };
      const invoice = await tx.invoice.update({ where: { id: locked.id }, data: { status: "CANCELLED" } });
      return { kind: "OK" as const, invoice };
    });
    if (result.kind === "MISSING") return ActionResponse.failure(ERROR_CODES.NOT_FOUND, "Invoice not found.");
    if (result.kind === "INVALID") return ActionResponse.failure(ERROR_CODES.CONFLICT, "Paid or cancelled invoices cannot be cancelled.");
    return ActionResponse.success(result.invoice, "Invoice cancelled");
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
      select: { id: true, projectId: true, status: true, currency: true },
    });
    if (!invoice) {
      return ActionResponse.failure(ERROR_CODES.NOT_FOUND, "Invoice not found.");
    }

    if (invoice.status !== "DRAFT") {
      return ActionResponse.failure(
        ERROR_CODES.CONFLICT,
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

    const currency = invoice.currency as InvoiceCurrency;
    if (INVOICE_CURRENCIES[currency] === undefined) {
      return ActionResponse.failure(ERROR_CODES.VALIDATION_ERROR, "This invoice uses an unsupported currency.");
    }
    if (INVOICE_CURRENCIES[currency] === 0 && !Number.isInteger(Number(input.unitPrice))) {
      return ActionResponse.failure(ERROR_CODES.VALIDATION_ERROR, `${currency} invoices require whole-unit prices.`);
    }
    if (computeLineAmountMinor(input.quantity ?? 1, input.unitPrice, currency) > toScaledInteger(MAX_INVOICE_AMOUNT, INVOICE_CURRENCIES[currency])) {
      return ActionResponse.failure(ERROR_CODES.VALIDATION_ERROR, "The line item exceeds the supported maximum.");
    }

    const result = await withDraftInvoice(input.invoiceId, async (tx, locked) => {
      const quantity = input.quantity ?? 1;
      if (input.deliverableId) {
        const deliverable = await tx.deliverable.findUnique({
          where: { id: input.deliverableId },
          select: { projectId: true, status: true },
        });
        if (!deliverable || deliverable.projectId !== locked.projectId || deliverable.status !== "APPROVED") return "INVALID_DELIVERABLE" as const;
      }
      const lineItem = await tx.invoiceLineItem.create({
        data: {
          invoiceId: locked.id,
          description: input.description,
          quantity: toQuantityDecimal(quantity),
          unitPrice: toDecimal(input.unitPrice),
          amount: toDecimal(computeLineAmount(quantity, input.unitPrice, currency)),
          deliverableId: input.deliverableId ?? null,
        },
      });
      const updated = await recalculateInvoiceInTransaction(tx, locked.id);
      if (!updated) throw new Error("Invoice totals could not be recalculated.");
      return lineItem;
    });
    if (result.kind === "MISSING") return ActionResponse.failure(ERROR_CODES.NOT_FOUND, "Invoice not found.");
    if (result.kind === "NOT_DRAFT") return ActionResponse.failure(ERROR_CODES.CONFLICT, "Only draft invoices can have line items added.");
    if (result.value === "INVALID_DELIVERABLE") return ActionResponse.failure(ERROR_CODES.VALIDATION_ERROR, "The deliverable must belong to the invoice project.");
    return ActionResponse.success(result.value, "Line item added");
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
      select: { id: true, projectId: true, status: true, currency: true },
    });
    if (!invoice) {
      return ActionResponse.failure(ERROR_CODES.NOT_FOUND, "Invoice not found.");
    }

    if (invoice.status !== "DRAFT") {
      return ActionResponse.failure(
        ERROR_CODES.CONFLICT,
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

    const result = await withDraftInvoice(existing.invoiceId, async (tx, locked) => {
      const lineItem = await tx.invoiceLineItem.findFirst({
        where: { id: input.id, invoiceId: locked.id },
      });
      if (!lineItem) return "MISSING_LINE" as const;
      const currency = locked.currency as InvoiceCurrency;
      const precision = INVOICE_CURRENCIES[currency];
      if (precision === undefined) return "UNSUPPORTED_CURRENCY" as const;
      const remaining = await tx.invoiceLineItem.findMany({
        where: { invoiceId: locked.id, id: { not: input.id } },
        select: { amount: true },
      });
      const subtotal = remaining.reduce((sum, item) => sum + toScaledInteger(String(item.amount), precision), BigInt(0));
      if (toScaledInteger(String(locked.discount), precision) > subtotal) return "DISCOUNT_EXCEEDS_SUBTOTAL" as const;
      await tx.invoiceLineItem.delete({ where: { id: input.id } });
      const updated = await recalculateInvoiceInTransaction(tx, locked.id);
      if (!updated) throw new Error("Invoice totals could not be recalculated.");
      return { deleted: true };
    });
    if (result.kind === "MISSING") return ActionResponse.failure(ERROR_CODES.NOT_FOUND, "Invoice not found.");
    if (result.kind === "NOT_DRAFT") return ActionResponse.failure(ERROR_CODES.CONFLICT, "Only draft invoices can have line items removed.");
    if (result.value === "MISSING_LINE") return ActionResponse.failure(ERROR_CODES.NOT_FOUND, "Line item not found.");
    if (result.value === "UNSUPPORTED_CURRENCY") return ActionResponse.failure(ERROR_CODES.VALIDATION_ERROR, `Currency ${invoice.currency} is no longer supported for money changes.`);
    if (result.value === "DISCOUNT_EXCEEDS_SUBTOTAL") return ActionResponse.failure(ERROR_CODES.VALIDATION_ERROR, "Removing this item would make the discount exceed the subtotal.");
    return ActionResponse.success(result.value, "Line item removed");
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
        ERROR_CODES.CONFLICT,
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

    const result = await withDraftInvoice(input.invoiceId, async (tx, locked) => {
      if (locked.projectId !== input.projectId) return { kind: "WRONG_PROJECT" as const };
      const deliverables = await tx.deliverable.findMany({
        where: {
          id: { in: [...new Set(input.deliverableIds)] },
          projectId: locked.projectId,
          status: "APPROVED",
        },
        select: { id: true, title: true, description: true },
      });
      if (deliverables.length === 0) return { kind: "NO_APPROVED" as const };

      const linked = await tx.invoiceLineItem.findMany({
        where: {
          invoiceId: locked.id,
          deliverableId: { in: deliverables.map((item) => item.id) },
        },
        select: { deliverableId: true },
      });
      const linkedIds = new Set(linked.map((item) => item.deliverableId));
      const pending = deliverables.filter((item) => !linkedIds.has(item.id));
      if (pending.length === 0) return { kind: "OK" as const, converted: 0 };

      await tx.invoiceLineItem.createMany({
        data: pending.map((item) => ({
          invoiceId: locked.id,
          description: item.title + (item.description ? ` — ${item.description}` : ""),
          quantity: toQuantityDecimal(1),
          unitPrice: toDecimal(0),
          amount: toDecimal(0),
          deliverableId: item.id,
        })),
      });
      if (INVOICE_CURRENCIES[locked.currency as InvoiceCurrency] !== undefined) {
        const totalsUpdated = await recalculateInvoiceInTransaction(tx, locked.id);
        if (!totalsUpdated) throw new Error("Invoice totals could not be recalculated.");
      }
      return { kind: "OK" as const, converted: pending.length };
    });
    if (result.kind === "MISSING") return ActionResponse.failure(ERROR_CODES.NOT_FOUND, "Invoice not found.");
    if (result.kind === "NOT_DRAFT") return ActionResponse.failure(ERROR_CODES.CONFLICT, "Only draft invoices can have deliverables converted.");
    if (result.value.kind === "WRONG_PROJECT") return ActionResponse.failure(ERROR_CODES.FORBIDDEN, "Invoice does not belong to this project.");
    if (result.value.kind === "NO_APPROVED") return ActionResponse.failure(ERROR_CODES.VALIDATION_ERROR, "No approved deliverables found to convert.");
    return ActionResponse.success(
      { converted: result.value.converted },
      `${result.value.converted} deliverable(s) converted to line items`,
    );
  },
});
