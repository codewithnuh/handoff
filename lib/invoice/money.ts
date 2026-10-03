/**
 * Invoice money — the server half of the invoice-money module.
 *
 * Three policies live here so no action can opt out of them:
 *
 *   1. Number allocation: read-last-then-insert becomes a transaction against
 *      the (projectId, invoiceNumber) unique constraint, retried on collision.
 *   2. Total recalculation: reading line items and writing the totals happens
 *      in one transaction, not as two unrelated statements.
 *   3. Decimal mapping: money columns pass through exact minor-unit rounding
 *      before Prisma receives a decimal string.
 *
 * The pure arithmetic (`computeTotals`) lives in ./totals so the client-side
 * create-invoice preview computes exactly what the server will store.
 */

import { Prisma, type Invoice } from "@/app/generated/prisma/client";
import { db } from "@/lib/prisma";
import { computeLineAmountMinor, computeTotalsFromAmountsExact, MAX_INVOICE_AMOUNT } from "@/lib/invoice/totals";
import {
  fromScaledInteger,
  INVOICE_CURRENCIES,
  toScaledInteger,
  roundToPrecision,
  type InvoiceCurrency,
} from "@/lib/invoice/totals";

type Tx = Prisma.TransactionClient;

export type InvoiceSeed = Omit<
  Prisma.InvoiceUncheckedCreateInput,
  "projectId" | "invoiceNumber" | "lineItems"
>;

export type LineItemSeed = {
  description: string;
  quantity: number;
  unitPrice: number;
  deliverableId?: string | null;
};

export type LockedInvoiceMutation<T> = (tx: Tx, invoice: Invoice) => Promise<T>;

/** Serialize every invoice edit and lifecycle transition on the invoice row. */
export async function withLockedInvoice<T>(
  invoiceId: string,
  mutation: (tx: Tx, invoice: Invoice | null) => Promise<T>,
): Promise<T> {
  return db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "invoices" WHERE "id" = ${invoiceId} FOR UPDATE
    `;
    const invoice = rows.length
      ? await tx.invoice.findUnique({ where: { id: invoiceId } })
      : null;
    return mutation(tx, invoice);
  });
}

/** Serialize and enforce the draft-only policy in the same transaction. */
export async function withDraftInvoice<T>(
  invoiceId: string,
  mutation: LockedInvoiceMutation<T>,
): Promise<{ kind: "MISSING" } | { kind: "NOT_DRAFT" } | { kind: "OK"; value: T }> {
  return withLockedInvoice(invoiceId, async (tx, invoice) => {
    if (!invoice) return { kind: "MISSING" };
    if (invoice.status !== "DRAFT") return { kind: "NOT_DRAFT" };
    return { kind: "OK", value: await mutation(tx, invoice) };
  });
}

/** Attempts to allocate a number before giving up (a collision rolls back and retries). */
const MAX_NUMBER_ATTEMPTS = 3;

/**
 * The one place a JS number becomes a money Decimal column: round to storage
 * precision, then hand Prisma a 2-decimal string.
 */
export function toDecimal(value: number | string): Prisma.Decimal {
  return new Prisma.Decimal(roundToPrecision(value, 2));
}

export function toQuantityDecimal(value: number | string): Prisma.Decimal {
  return new Prisma.Decimal(roundToPrecision(value, 3));
}

export type MoneyStrings = {
  subtotal: string;
  discount: string;
  taxRate: string;
  taxAmount: string;
  amount: string;
};

/**
 * The inverse: money Decimal columns as the plain strings every consumer
 * (project detail, portal detail, the PDF route) serializes with — written
 * once instead of once per call site.
 */
export function moneyStrings<
  T extends {
    subtotal: unknown;
    discount: unknown;
    taxRate: unknown;
    taxAmount: unknown;
    amount: unknown;
  },
>(
  row: T,
): Omit<T, keyof MoneyStrings> & MoneyStrings {
  return {
    ...row,
    subtotal: String(row.subtotal),
    discount: String(row.discount),
    taxRate: String(row.taxRate),
    taxAmount: String(row.taxAmount),
    amount: String(row.amount),
  };
}

/** Same inverse for a line item's two money columns. */
export function lineItemMoneyStrings<
  T extends { unitPrice: unknown; amount: unknown },
>(row: T): Omit<T, "unitPrice" | "amount"> & { unitPrice: string; amount: string } {
  return {
    ...row,
    unitPrice: String(row.unitPrice),
    amount: String(row.amount),
  };
}

const isUniqueViolation = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === "P2002";

/**
 * Next invoice number for a project (INV-001, INV-002, …): one past the
 * highest number already stored. Ignores rows that don't match the scheme.
 */
async function nextInvoiceNumber(tx: Tx, projectId: string): Promise<string> {
  const rows = await tx.invoice.findMany({
    where: { projectId },
    select: { invoiceNumber: true },
  });

  let highest = 0;
  for (const row of rows) {
    const match = row.invoiceNumber.match(/^INV-(\d+)$/);
    if (match) highest = Math.max(highest, parseInt(match[1], 10));
  }

  return `INV-${String(highest + 1).padStart(3, "0")}`;
}

export async function recalculateInvoiceInTransaction(tx: Tx, invoiceId: string): Promise<boolean> {
  const lineItems = await tx.invoiceLineItem.findMany({
    where: { invoiceId },
    select: { amount: true },
  });

  const invoice = await tx.invoice.findUnique({
    where: { id: invoiceId },
    select: { taxRate: true, discount: true, currency: true },
  });

  if (!invoice) return false;

  const currency = invoice.currency as InvoiceCurrency;
  const precision = INVOICE_CURRENCIES[currency];
  // Keep this guard close to persistence so unexpected legacy currencies fail
  // visibly instead of writing totals with an implicit USD scale.
  if (precision === undefined) throw new RangeError(`Unsupported invoice currency: ${invoice.currency}`);
  const totals = computeTotalsFromAmountsExact({
    lineAmounts: lineItems.map((item) => String(item.amount)),
    discount: String(invoice.discount),
    taxRate: String(invoice.taxRate),
    currency,
  });

  if (toScaledInteger(String(invoice.discount), precision) > toScaledInteger(totals.subtotal, precision)) return false;
  if (toScaledInteger(totals.total, precision) > toScaledInteger(MAX_INVOICE_AMOUNT, precision)) return false;

  await tx.invoice.update({
    where: { id: invoiceId },
    data: {
      subtotal: toDecimal(totals.subtotal),
      taxAmount: toDecimal(totals.taxAmount),
      amount: toDecimal(totals.total),
    },
  });
  return true;
}

/**
 * Recompute subtotal / tax / total from the line items. The read and the
 * write share one transaction — callers cannot run half of it.
 */
export async function recalculateInvoice(invoiceId: string): Promise<void> {
  await withLockedInvoice(invoiceId, async (tx, invoice) => {
    if (!invoice || invoice.status !== "DRAFT") return;
    await recalculateInvoiceInTransaction(tx, invoiceId);
  });
}

/**
 * Create an invoice under a freshly allocated number. Number allocation,
 * the insert, any line items and the first recalculation are one
 * transaction; a concurrent request that wins the race for the same number
 * makes this one retry with the next number instead of failing the caller.
 */
export async function createInvoiceWithNumber(
  projectId: string,
  invoice: InvoiceSeed,
  lineItems: LineItemSeed[] = [],
  actor?: { actorUserId: string; actorEmail: string; actorName: string | null },
): Promise<Invoice> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await db.$transaction(async (tx) => {
        const invoiceNumber = await nextInvoiceNumber(tx, projectId);

        const created = await tx.invoice.create({
          data: { ...invoice, projectId, invoiceNumber },
        });

        if (lineItems.length > 0) {
          const currency = invoice.currency as InvoiceCurrency;
          await tx.invoiceLineItem.createMany({
            data: lineItems.map((item) => ({
              invoiceId: created.id,
              description: item.description,
              quantity: toQuantityDecimal(item.quantity),
              unitPrice: toDecimal(item.unitPrice),
              amount: toDecimal(fromScaledInteger(
                computeLineAmountMinor(item.quantity, item.unitPrice, currency),
                INVOICE_CURRENCIES[currency],
              )),
              deliverableId: item.deliverableId ?? null,
            })),
          });

          const totalsUpdated = await recalculateInvoiceInTransaction(tx, created.id);
          if (!totalsUpdated) throw new RangeError("Invoice discount cannot exceed the subtotal.");
        }

        const current = lineItems.length
          ? (await tx.invoice.findUnique({ where: { id: created.id } })) ?? created
          : created;
        if (actor) {
          await tx.activity.create({
            data: {
              projectId,
              type: "INVOICE_CREATED",
              ...actor,
              meta: { invoiceNumber: current.invoiceNumber, invoiceId: current.id },
            },
          });
        }
        return current;
      });
    } catch (error) {
      if (attempt >= MAX_NUMBER_ATTEMPTS || !isUniqueViolation(error)) {
        throw error;
      }
    }
  }
}
