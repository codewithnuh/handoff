/**
 * Invoice money — the server half of the invoice-money module.
 *
 * Three policies live here so no action can opt out of them:
 *
 *   1. Number allocation: read-last-then-insert becomes a transaction against
 *      the (projectId, invoiceNumber) unique constraint, retried on collision.
 *   2. Total recalculation: reading line items and writing the totals happens
 *      in one transaction, not as two unrelated statements.
 *   3. Decimal mapping: JS numbers become money columns through `toDecimal`
 *      only — one `.toFixed(2)` for the whole product.
 *
 * The pure arithmetic (`computeTotals`) lives in ./totals so the client-side
 * create-invoice preview computes exactly what the server will store.
 */

import { Prisma, type Invoice } from "@/app/generated/prisma/client";
import { db } from "@/lib/prisma";
import { computeTotals } from "@/lib/invoice/totals";

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

/** Attempts to allocate a number before giving up (a collision rolls back and retries). */
const MAX_NUMBER_ATTEMPTS = 3;

/**
 * The one place a JS number becomes a money Decimal column: round to storage
 * precision, then hand Prisma a 2-decimal string.
 */
export function toDecimal(value: number | string): Prisma.Decimal {
  return new Prisma.Decimal(typeof value === "number" ? value.toFixed(2) : value);
}

export type MoneyStrings = {
  subtotal: string;
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

async function recalculate(tx: Tx, invoiceId: string): Promise<void> {
  const lineItems = await tx.invoiceLineItem.findMany({
    where: { invoiceId },
    select: { amount: true },
  });

  const invoice = await tx.invoice.findUnique({
    where: { id: invoiceId },
    select: { taxRate: true, discount: true },
  });

  if (!invoice) return;

  const totals = computeTotals({
    subtotal: lineItems.reduce((sum, item) => sum + Number(item.amount), 0),
    discount: Number(invoice.discount),
    taxRate: Number(invoice.taxRate),
  });

  await tx.invoice.update({
    where: { id: invoiceId },
    data: {
      subtotal: toDecimal(totals.subtotal),
      taxAmount: toDecimal(totals.taxAmount),
      amount: toDecimal(totals.total),
    },
  });
}

/**
 * Recompute subtotal / tax / total from the line items. The read and the
 * write share one transaction — callers cannot run half of it.
 */
export async function recalculateInvoice(invoiceId: string): Promise<void> {
  await db.$transaction((tx) => recalculate(tx, invoiceId));
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
): Promise<Invoice> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await db.$transaction(async (tx) => {
        const invoiceNumber = await nextInvoiceNumber(tx, projectId);

        const created = await tx.invoice.create({
          data: { ...invoice, projectId, invoiceNumber },
        });

        if (lineItems.length > 0) {
          await tx.invoiceLineItem.createMany({
            data: lineItems.map((item) => ({
              invoiceId: created.id,
              description: item.description,
              quantity: item.quantity,
              unitPrice: toDecimal(item.unitPrice),
              amount: toDecimal(item.quantity * item.unitPrice),
              deliverableId: item.deliverableId ?? null,
            })),
          });

          await recalculate(tx, created.id);
        }

        return created;
      });
    } catch (error) {
      if (attempt >= MAX_NUMBER_ATTEMPTS || !isUniqueViolation(error)) {
        throw error;
      }
    }
  }
}
