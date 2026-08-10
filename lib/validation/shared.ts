import { z } from "zod";
import {
  DeliverableStatus,
  InvoiceStatus,
  ProjectStatus,
  RequestStatus,
} from "@/app/generated/prisma/client";

// ──────────────────────────────────────────────
// Common primitives
// Every string is trimmed and length-capped so the
// payload we hand to Prisma is already sanitized.
// ──────────────────────────────────────────────

export const idSchema = z
  .string()
  .trim()
  .min(1, { message: "Id is required" })
  .max(64, { message: "Id is too long" });

export const nameSchema = z
  .string()
  .trim()
  .min(1, { message: "Name is required" })
  .max(120, { message: "Name must be at most 120 characters" });

export const titleSchema = z
  .string()
  .trim()
  .min(1, { message: "Title is required" })
  .max(200, { message: "Title must be at most 200 characters" });

export const emailSchema = z
  .string()
  .trim()
  .email({ message: "Invalid email address" })
  .max(254, { message: "Email must be at most 254 characters" })
  .transform((value) => value.toLowerCase());

export const optionalEmailSchema = z.union([
  z
    .string()
    .trim()
    .email({ message: "Invalid email address" })
    .max(254, { message: "Email must be at most 254 characters" })
    .transform((value) => value.toLowerCase()),
  z.literal(""),
]);

/** Optional string field, trimmed and capped. Accepts null to clear a nullable column. */
export const optionalNullableString = (max: number, field: string) =>
  z
    .string()
    .trim()
    .max(max, { message: `${field} must be at most ${max} characters` })
    .nullable()
    .optional();

export const descriptionSchema = optionalNullableString(5000, "Description");

export const noteSchema = optionalNullableString(2000, "Notes");

export const companySchema = optionalNullableString(200, "Company");

// ──────────────────────────────────────────────
// Domain enums
// Derived from the generated Prisma enum objects so the
// validator stays automatically in sync with the schema.
// ──────────────────────────────────────────────

const enumTuple = <T extends string>(obj: Record<string, T>) =>
  Object.values(obj) as [T, ...T[]];

export const projectStatusSchema = z.enum(enumTuple(ProjectStatus));
export const deliverableStatusSchema = z.enum(enumTuple(DeliverableStatus));
export const requestStatusSchema = z.enum(enumTuple(RequestStatus));
export const invoiceStatusSchema = z.enum(enumTuple(InvoiceStatus));

// ──────────────────────────────────────────────
// Scalar helpers
// ──────────────────────────────────────────────

export const progressSchema = z
  .number()
  .int({ message: "Progress must be a whole number" })
  .min(0, { message: "Progress must be at least 0" })
  .max(100, { message: "Progress must be at most 100" });

export const dateSchema = z
  .union([
    z.date(),
    z.string().datetime({ offset: true }),
  ])
  .transform((value) => (value instanceof Date ? value : new Date(value)));

export const optionalDateSchema = dateSchema.nullable().optional();

/** Positive money value (up to 2 decimals). Stored as a string for Prisma Decimal. */
export const amountSchema = z
  .string()
  .trim()
  .min(1, { message: "Amount is required" })
  .max(20, { message: "Amount is too large" })
  .refine(
    (value) => /^\d+(\.\d{1,2})?$/.test(value) && Number(value) > 0,
    { message: "Amount must be a positive number with at most 2 decimal places" },
  );

/** Non-negative integer (e.g. file size in bytes). */
export const nonNegativeIntSchema = z
  .number()
  .int({ message: "Value must be a whole number" })
  .min(0, { message: "Value must be at least 0" });
