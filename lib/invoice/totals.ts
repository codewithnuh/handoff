/**
 * Invoice money math — the pure half of the invoice-money module.
 *
 * No database, no Prisma: safe to import from server actions and from the
 * client-side create-invoice preview, so both sides compute identical
 * numbers from one implementation.
 */

/** Invoice totals, rounded to the 2 decimals every money column stores. */
export type InvoiceTotals = {
  subtotal: number;
  discount: number;
  taxableAmount: number;
  taxAmount: number;
  total: number;
};

/** Round to 2 decimal places — the precision money columns are stored at. */
export function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}

/** Line-item amount: quantity × unit price, at storage precision. */
export function lineAmount(quantity: number, unitPrice: number): number {
  return quantity * unitPrice;
}

/**
 * Subtotal → discount → tax → total, the way every invoice in the product
 * (server recalculation and the create-dialog preview) must agree to agree.
 */
export function computeTotals(input: {
  subtotal: number;
  discount: number;
  taxRate: number;
}): InvoiceTotals {
  const taxableAmount = Math.max(0, input.subtotal - input.discount);
  const taxAmount = taxableAmount * (input.taxRate / 100);
  const total = taxableAmount + taxAmount;

  return {
    subtotal: roundMoney(input.subtotal),
    discount: roundMoney(input.discount),
    taxableAmount: roundMoney(taxableAmount),
    taxAmount: roundMoney(taxAmount),
    total: roundMoney(total),
  };
}
