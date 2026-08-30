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
// Invoice CRUD
// ──────────────────────────────────────────────

export const createInvoiceSchema = z.object({
  projectId: idSchema,
  description: descriptionSchema,
  dueDate: dateSchema.nullable().optional(),
  taxRate: z
    .number()
    .min(0, { message: "Tax rate must be at least 0" })
    .max(100, { message: "Tax rate must be at most 100" })
    .optional()
    .default(0),
  paymentNotes: noteSchema,
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
// Invoice Line Items
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
    .int({ message: "Quantity must be a whole number" })
    .min(1, { message: "Quantity must be at least 1" })
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
