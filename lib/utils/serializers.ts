import type { Invoice } from "@/app/generated/prisma/client";

/**
 * Prisma returns `amount` as a `Decimal` object, which does not serialize
 * cleanly through server actions / forms. We expose it as a plain string
 * so the response contract stays JSON-safe and type-safe.
 */
export type SerializedInvoice = Omit<Invoice, "amount"> & { amount: string };

export const serializeInvoice = (invoice: Invoice): SerializedInvoice => ({
  ...invoice,
  amount: String(invoice.amount),
});
