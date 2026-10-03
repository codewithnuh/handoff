/** Exact invoice arithmetic shared by the client preview and server writes. */

export const INVOICE_CURRENCIES = {
  USD: 2,
  EUR: 2,
  GBP: 2,
  CAD: 2,
  AUD: 2,
  JPY: 0,
  CHF: 2,
  INR: 2,
} as const;

export type InvoiceCurrency = keyof typeof INVOICE_CURRENCIES;
export const SUPPORTED_INVOICE_CURRENCIES = Object.keys(INVOICE_CURRENCIES) as InvoiceCurrency[];
export const DEFAULT_INVOICE_CURRENCY: InvoiceCurrency = "USD";
export const MAX_INVOICE_AMOUNT = 9_999_999_999.99;
const QUANTITY_SCALE = 3;

type DecimalInput = number | string;

function decimalParts(value: DecimalInput): { negative: boolean; digits: string; scale: number } {
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new RangeError("Invoice values must be finite numbers.");
  }

  const text = String(value).trim();
  const match = /^([+-]?)(\d+)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(text);
  if (!match) throw new RangeError("Invoice values must be valid decimal numbers.");

  const fraction = match[3] ?? "";
  const exponent = Number(match[4] ?? 0);
  let digits = `${match[2]}${fraction}`.replace(/^0+(?=\d)/, "");
  let scale = fraction.length - exponent;
  if (scale < 0) {
    digits += "0".repeat(-scale);
    scale = 0;
  }

  return { negative: match[1] === "-", digits, scale };
}

/** Convert a decimal to a scaled integer, rounding half away from zero. */
export function toScaledInteger(value: DecimalInput, precision: number): bigint {
  const parts = decimalParts(value);
  const shift = precision - parts.scale;
  let magnitude: bigint;
  if (shift >= 0) {
    magnitude = BigInt(parts.digits) * BigInt(10) ** BigInt(shift);
  } else {
    const divisor = BigInt(10) ** BigInt(-shift);
    const source = BigInt(parts.digits);
    const quotient = source / divisor;
    const remainder = source % divisor;
    magnitude = quotient + (remainder * BigInt(2) >= divisor ? BigInt(1) : BigInt(0));
  }
  return parts.negative ? -magnitude : magnitude;
}

export function hasAtMostDecimalPlaces(value: DecimalInput, precision: number): boolean {
  return decimalParts(value).scale <= precision;
}

export function fromScaledInteger(value: bigint, precision: number): string {
  const negative = value < BigInt(0);
  const magnitude = negative ? -value : value;
  const scale = BigInt(10) ** BigInt(precision);
  const whole = magnitude / scale;
  if (precision === 0) return `${negative ? "-" : ""}${whole}`;
  const fraction = String(magnitude % scale).padStart(precision, "0");
  return `${negative ? "-" : ""}${whole}.${fraction}`;
}

export function roundToPrecision(value: DecimalInput, precision: number): string {
  return fromScaledInteger(toScaledInteger(value, precision), precision);
}

export function computeLineAmountMinor(
  quantity: DecimalInput,
  unitPrice: DecimalInput,
  currency: InvoiceCurrency = DEFAULT_INVOICE_CURRENCY,
): bigint {
  const precision = INVOICE_CURRENCIES[currency];
  const quantityUnits = toScaledInteger(quantity, QUANTITY_SCALE);
  const priceUnits = toScaledInteger(unitPrice, precision);
  const product = quantityUnits * priceUnits;
  const divisor = BigInt(10) ** BigInt(QUANTITY_SCALE);
  const sign = product < BigInt(0) ? BigInt(-1) : BigInt(1);
  const magnitude = product < BigInt(0) ? -product : product;
  return sign * ((magnitude + divisor / BigInt(2)) / divisor);
}

export function computeLineAmount(
  quantity: DecimalInput,
  unitPrice: DecimalInput,
  currency: InvoiceCurrency = DEFAULT_INVOICE_CURRENCY,
): number {
  return Number(fromScaledInteger(computeLineAmountMinor(quantity, unitPrice, currency), INVOICE_CURRENCIES[currency]));
}

export type InvoiceTotals = {
  subtotal: number;
  discount: number;
  taxableAmount: number;
  taxAmount: number;
  total: number;
};

export type InvoiceTotalsExact = {
  subtotal: string;
  discount: string;
  taxableAmount: string;
  taxAmount: string;
  total: string;
};

export type InvoiceLineAmountInput = {
  quantity: DecimalInput;
  unitPrice: DecimalInput;
};

export function computeTotals(input: {
  lineItems: InvoiceLineAmountInput[];
  discount: DecimalInput;
  taxRate: DecimalInput;
  currency?: InvoiceCurrency;
}): InvoiceTotals {
  const currency = input.currency ?? DEFAULT_INVOICE_CURRENCY;
  const precision = INVOICE_CURRENCIES[currency];
  const lineAmounts = input.lineItems.map((item) =>
    fromScaledInteger(computeLineAmountMinor(item.quantity, item.unitPrice, currency), precision),
  );
  return computeTotalsFromAmounts({
    lineAmounts,
    discount: input.discount,
    taxRate: input.taxRate,
    currency,
  });
}

export function computeTotalsExact(input: {
  lineItems: InvoiceLineAmountInput[];
  discount: DecimalInput;
  taxRate: DecimalInput;
  currency?: InvoiceCurrency;
}): InvoiceTotalsExact {
  const currency = input.currency ?? DEFAULT_INVOICE_CURRENCY;
  const precision = INVOICE_CURRENCIES[currency];
  return computeTotalsFromAmountsExact({
    lineAmounts: input.lineItems.map((item) =>
      fromScaledInteger(computeLineAmountMinor(item.quantity, item.unitPrice, currency), precision),
    ),
    discount: input.discount,
    taxRate: input.taxRate,
    currency,
  });
}

export function computeTotalsFromAmounts(input: {
  lineAmounts: DecimalInput[];
  discount: DecimalInput;
  taxRate: DecimalInput;
  currency?: InvoiceCurrency;
}): InvoiceTotals {
  const exact = computeTotalsFromAmountsExact(input);
  return {
    subtotal: Number(exact.subtotal),
    discount: Number(exact.discount),
    taxableAmount: Number(exact.taxableAmount),
    taxAmount: Number(exact.taxAmount),
    total: Number(exact.total),
  };
}

export function computeTotalsFromAmountsExact(input: {
  lineAmounts: DecimalInput[];
  discount: DecimalInput;
  taxRate: DecimalInput;
  currency?: InvoiceCurrency;
}): InvoiceTotalsExact {
  const currency = input.currency ?? DEFAULT_INVOICE_CURRENCY;
  const precision = INVOICE_CURRENCIES[currency];
  const subtotalMinor = input.lineAmounts.reduce(
    (sum, amount) => sum + toScaledInteger(amount, precision),
    BigInt(0),
  );
  const discountMinor = toScaledInteger(input.discount, precision);
  const taxableMinor = subtotalMinor > discountMinor ? subtotalMinor - discountMinor : BigInt(0);
  const rateHundredths = toScaledInteger(input.taxRate, 2);
  const taxDivisor = BigInt(10_000);
  const taxNumerator = taxableMinor * rateHundredths;
  const taxMinor = (taxNumerator + taxDivisor / BigInt(2)) / taxDivisor;
  const totalMinor = taxableMinor + taxMinor;
  return {
    subtotal: fromScaledInteger(subtotalMinor, precision),
    discount: fromScaledInteger(discountMinor, precision),
    taxableAmount: fromScaledInteger(taxableMinor, precision),
    taxAmount: fromScaledInteger(taxMinor, precision),
    total: fromScaledInteger(totalMinor, precision),
  };
}
