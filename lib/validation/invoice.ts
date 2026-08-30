import { z } from "zod";
import {
  amountSchema,
  dateSchema,
  descriptionSchema,
  idSchema,
  invoiceStatusSchema,
  noteSchema,
} from "@/lib/validation/shared";

// ──────────────────────────────────────────────
// Invoice Line Items (inline creation)
// ──────────────────────────────────────────────

export const invoiceLineItemSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, { message: "Description is required" })
    .max(500, { message: "Description must be at most 500 characters" }),
  quantity: z
    .number()
    .positive({ message: "Quantity must be greater than 0" }),
  unitPrice: z
    .number()
    .min(0, { message: "Unit price cannot be negative" }),
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
    taxRate: z
      .number()
      .min(0, { message: "Tax rate must be at least 0" })
      .max(100, { message: "Tax rate must be at most 100" })
      .optional()
      .default(0),
    discount: z
      .number()
      .min(0, { message: "Discount cannot be negative" })
      .optional()
      .default(0),
    currency: z
      .string()
      .length(3, "Currency must be a 3-letter ISO code (e.g. USD)")
      .optional()
      .default("USD"),
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
      .min(1, { message: "Add at least one line item" })
      .optional(),
  })
  .refine((data) => data.dueDate === null || data.dueDate === undefined || data.dueDate >= new Date(), {
    message: "Due date cannot be in the past",
    path: ["dueDate"],
  });
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const updateInvoiceSchema = z.object({
  id: idSchema,
  description: descriptionSchema,
  dueDate: dateSchema.nullable().optional(),
  taxRate: z
    .number()
    .min(0, { message: "Tax rate must be at least 0" })
    .max(100, { message: "Tax rate must be at most 100" })
    .optional(),
  discount: z
    .number()
    .min(0, { message: "Discount cannot be negative" })
    .optional(),
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
  quantity: z
    .number()
    .positive({ message: "Quantity must be greater than 0" })
    .default(1),
  unitPrice: amountSchema,
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
