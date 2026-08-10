import { z } from "zod";
import {
  amountSchema,
  idSchema,
  invoiceStatusSchema,
  optionalDateSchema,
  optionalNullableString,
} from "@/lib/validation/shared";

export const invoiceNumberSchema = z
  .string()
  .trim()
  .min(1, { message: "Invoice number is required" })
  .max(40, { message: "Invoice number must be at most 40 characters" });

export const currencySchema = z
  .string()
  .trim()
  .regex(/^[A-Z]{3}$/, { message: "Currency must be a 3-letter code (e.g. USD)" })
  .max(3, { message: "Currency must be a 3-letter code (e.g. USD)" });

export const createInvoiceSchema = z.object({
  projectId: idSchema,
  invoiceNumber: invoiceNumberSchema,
  description: optionalNullableString(1000, "Description"),
  amount: amountSchema,
  currency: currencySchema.optional(),
  dueDate: optionalDateSchema,
});
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const updateInvoiceSchema = z.object({
  id: idSchema,
  invoiceNumber: invoiceNumberSchema.optional(),
  description: optionalNullableString(1000, "Description"),
  amount: amountSchema.optional(),
  currency: currencySchema.optional(),
  dueDate: optionalDateSchema,
});
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;

export const invoiceIdSchema = z.object({
  id: idSchema,
});
export type InvoiceIdInput = z.infer<typeof invoiceIdSchema>;

export const projectInvoicesSchema = z.object({
  projectId: idSchema,
});
export type ProjectInvoicesInput = z.infer<typeof projectInvoicesSchema>;

export const updateInvoiceStatusSchema = z.object({
  id: idSchema,
  status: invoiceStatusSchema,
});
export type UpdateInvoiceStatusInput = z.infer<
  typeof updateInvoiceStatusSchema
>;
