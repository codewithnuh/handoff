import { z } from "zod";
import {
  amountSchema,
  dateSchema,
  descriptionSchema,
  idSchema,
  noteSchema,
} from "@/lib/validation/shared";
import {
  computeLineAmountMinor,
  computeTotals,
  hasAtMostDecimalPlaces,
  INVOICE_CURRENCIES,
  MAX_INVOICE_AMOUNT,
  toScaledInteger,
  type InvoiceCurrency,
} from "@/lib/invoice/totals";

const currencySchema = z.enum(Object.keys(INVOICE_CURRENCIES) as [InvoiceCurrency, ...InvoiceCurrency[]]);

const unitPriceSchema = z.number()
  .min(0, { message: "Unit price cannot be negative" })
  .max(MAX_INVOICE_AMOUNT, { message: "Unit price exceeds the supported maximum" })
  .refine((value) => hasAtMostDecimalPlaces(value, 2), {
    message: "Unit price supports at most 2 decimal places",
  });

const quantitySchema = z.number()
  .positive({ message: "Quantity must be greater than 0" })
  .max(999_999.999, { message: "Quantity exceeds the supported maximum" })
  .refine((value) => hasAtMostDecimalPlaces(value, 3), {
    message: "Quantity supports at most 3 decimal places",
  });

const taxRateSchema = z.number()
  .min(0, { message: "Tax rate must be at least 0" })
  .max(100, { message: "Tax rate must be at most 100" })
  .refine((value) => hasAtMostDecimalPlaces(value, 2), {
    message: "Tax rate supports at most 2 decimal places",
  });

const discountSchema = z.number()
  .min(0, { message: "Discount cannot be negative" })
  .max(MAX_INVOICE_AMOUNT, { message: "Discount exceeds the supported maximum" })
  .refine((value) => hasAtMostDecimalPlaces(value, 2), {
    message: "Discount supports at most 2 decimal places",
  });

const validateCurrencyPrecision = (
  value: { currency?: InvoiceCurrency; discount?: number; lineItems?: { quantity: number; unitPrice: number }[] },
  ctx: z.RefinementCtx,
) => {
  const precision = INVOICE_CURRENCIES[value.currency ?? "USD"];
  if (precision === 0) {
    if (value.discount !== undefined && !hasAtMostDecimalPlaces(value.discount, 0)) {
      ctx.addIssue({ code: "custom", path: ["discount"], message: `${value.currency} invoices require whole-unit discounts` });
    }
    value.lineItems?.forEach((item, index) => {
      if (!hasAtMostDecimalPlaces(item.unitPrice, precision)) {
        ctx.addIssue({ code: "custom", path: ["lineItems", index, "unitPrice"], message: `${value.currency} invoices require whole-unit prices` });
      }
    });
  }
};

// ──────────────────────────────────────────────
// Invoice Line Items (inline creation)
// ──────────────────────────────────────────────

export const invoiceLineItemSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, { message: "Description is required" })
    .max(500, { message: "Description must be at most 500 characters" }),
  quantity: quantitySchema,
  unitPrice: unitPriceSchema,
});
export type InvoiceLineItemInput = z.infer<typeof invoiceLineItemSchema>;

// ──────────────────────────────────────────────
// Address sub-schema
// ──────────────────────────────────────────────

const addressSchema = z
  .object({
    street: z.string().min(1, "Street is required"),
    city: z.string().min(1, "City is required"),
    postalCode: z.string().min(1, "Postal code is required"),
    country: z.string().min(1, "Country is required"),
  })
  .optional();

// ──────────────────────────────────────────────
// Invoice CRUD
// ──────────────────────────────────────────────

export const createInvoiceSchema = z
  .object({
    projectId: idSchema,
    description: descriptionSchema,
    dueDate: dateSchema.nullable().optional(),
    taxRate: taxRateSchema.optional().default(0),
    discount: discountSchema.optional().default(0),
    currency: currencySchema.optional().default("USD"),
    paymentNotes: noteSchema,
    // Sender details (freelancer) — autofilled from profile
    senderName: z.string().min(1, "Your name is required").optional(),
    senderEmail: z.string().email("Invalid sender email").optional(),
    senderAddress: addressSchema,
    senderTaxId: z.string().optional(),
    // Client details — autofilled from selected client
    clientName: z.string().min(1, "Client name is required").optional(),
    clientEmail: z.string().email("Invalid client email").optional(),
    clientAddress: addressSchema,
    clientTaxId: z.string().optional(),
    // Inline line items — at least one required
    lineItems: z
      .array(invoiceLineItemSchema)
      .min(1, { message: "Add at least one line item" }),
  })
  .refine((data) => data.dueDate === null || data.dueDate === undefined || data.dueDate >= new Date(), {
    message: "Due date cannot be in the past",
    path: ["dueDate"],
  })
  .superRefine((data, ctx) => {
    validateCurrencyPrecision(data, ctx);
    if (data.lineItems?.length) {
      const subtotal = data.lineItems.reduce(
        (sum, item) => sum + computeLineAmountMinor(item.quantity, item.unitPrice, data.currency),
        BigInt(0),
      );
      const discount = toScaledInteger(data.discount, INVOICE_CURRENCIES[data.currency]);
      if (discount > subtotal) {
        ctx.addIssue({ code: "custom", path: ["discount"], message: "Discount cannot exceed the invoice subtotal" });
      }
      const totals = computeTotals({
        lineItems: data.lineItems,
        discount: data.discount,
        taxRate: data.taxRate,
        currency: data.currency,
      });
      if (totals.total > MAX_INVOICE_AMOUNT) {
        ctx.addIssue({ code: "custom", path: ["lineItems"], message: "The invoice total exceeds the supported maximum" });
      }
    }
  });
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const updateInvoiceSchema = z.object({
  id: idSchema,
  description: descriptionSchema,
  dueDate: dateSchema.nullable().optional(),
  taxRate: taxRateSchema.optional(),
  discount: discountSchema.optional(),
  paymentNotes: noteSchema,
});
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;

export const invoiceIdSchema = z.object({
  id: idSchema,
});
export type InvoiceIdInput = z.infer<typeof invoiceIdSchema>;

export const sendInvoiceSchema = z.object({
  id: idSchema,
});
export type SendInvoiceInput = z.infer<typeof sendInvoiceSchema>;

export const markInvoicePaidSchema = z.object({
  id: idSchema,
});
export type MarkInvoicePaidInput = z.infer<typeof markInvoicePaidSchema>;

export const cancelInvoiceSchema = z.object({
  id: idSchema,
});
export type CancelInvoiceInput = z.infer<typeof cancelInvoiceSchema>;

// ──────────────────────────────────────────────
// Invoice Line Items (add/remove)
// ──────────────────────────────────────────────

export const addLineItemSchema = z.object({
  invoiceId: idSchema,
  description: z
    .string()
    .trim()
    .min(1, { message: "Description is required" })
    .max(500, { message: "Description must be at most 500 characters" }),
  quantity: quantitySchema.default(1),
  unitPrice: amountSchema.refine((value) => Number(value) <= MAX_INVOICE_AMOUNT, {
    message: "Unit price exceeds the supported maximum",
  }),
  deliverableId: idSchema.optional(),
});
export type AddLineItemInput = z.infer<typeof addLineItemSchema>;

export const removeLineItemSchema = z.object({
  id: idSchema,
});
export type RemoveLineItemInput = z.infer<typeof removeLineItemSchema>;

// ──────────────────────────────────────────────
// Convert Deliverables to Line Items
// ──────────────────────────────────────────────

export const convertDeliverablesSchema = z.object({
  projectId: idSchema,
  invoiceId: idSchema,
  deliverableIds: z
    .array(idSchema)
    .min(1, { message: "Select at least one deliverable" }),
});
export type ConvertDeliverablesInput = z.infer<
  typeof convertDeliverablesSchema
>;
