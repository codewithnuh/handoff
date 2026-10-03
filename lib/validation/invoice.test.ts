import { describe, expect, it } from "vitest";
import { createInvoiceSchema } from "@/lib/validation/invoice";

const validInvoice = (overrides: Record<string, unknown> = {}) => ({
  projectId: "project_1",
  currency: "USD",
  discount: 0,
  taxRate: 0,
  lineItems: [{ description: "Service", quantity: 1, unitPrice: 10 }],
  ...overrides,
});

describe("createInvoiceSchema money policy", () => {
  it("accepts fractional quantities to three decimals and the maximum stored unit price", () => {
    expect(createInvoiceSchema.safeParse(validInvoice({
      lineItems: [{ description: "Fractional", quantity: 0.125, unitPrice: 8.02 }],
    })).success).toBe(true);
    expect(createInvoiceSchema.safeParse(validInvoice({
      lineItems: [{ description: "Maximum", quantity: 1, unitPrice: 9_999_999_999.99 }],
    })).success).toBe(true);
  });

  it("rejects negative, excessive precision, unsupported currency, and out-of-range money", () => {
    const invalid = [
      validInvoice({ lineItems: [{ description: "Negative", quantity: -1, unitPrice: 1 }] }),
      validInvoice({ lineItems: [{ description: "Negative price", quantity: 1, unitPrice: -1 }] }),
      validInvoice({ lineItems: [{ description: "Precision", quantity: 0.1234, unitPrice: 1 }] }),
      validInvoice({ taxRate: 1.005 }),
      validInvoice({ currency: "XYZ" }),
      validInvoice({ lineItems: [{ description: "Too large", quantity: 2, unitPrice: 9_999_999_999.99 }] }),
      validInvoice({ currency: "JPY", lineItems: [{ description: "Fractional yen", quantity: 1, unitPrice: 1.5 }] }),
    ];
    for (const input of invalid) expect(createInvoiceSchema.safeParse(input).success).toBe(false);
  });

  it("rejects discounts above subtotal and totals above the storage maximum", () => {
    expect(createInvoiceSchema.safeParse(validInvoice({ discount: 10.01 })).success).toBe(false);
    expect(createInvoiceSchema.safeParse(validInvoice({
      taxRate: 100,
      lineItems: [{ description: "Tax overflow", quantity: 1, unitPrice: 9_999_999_999.99 }],
    })).success).toBe(false);
  });

  it("accepts zero values without producing a non-finite total", () => {
    expect(createInvoiceSchema.safeParse(validInvoice({
      lineItems: [{ description: "No charge", quantity: 1, unitPrice: 0 }],
    })).success).toBe(true);
  });
});
