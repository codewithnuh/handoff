import { z } from "zod";
import "dotenv/config";
const serverSchema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  NODE_ENV: z.enum(["development", "test", "production"]),
  // Optional SMTP transport for outbound email (verification, resets, OTP).
  // When absent in development, emails are logged to the console instead.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  EMAIL_FROM: z
    .string()
    .refine((v) => v.includes("@") || /^[^<]+<[^>]+@[^>]+>$/.test(v.trim()), {
      message: "Must be an email address or 'Name <email>' format",
    })
    .optional(),
  UPLOADTHING_SECRET: z.string().min(1, "UPLOADTHING_SECRET is required"),
});

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

const processEnv = {
  DATABASE_URL: process.env.DATABASE_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASSWORD: process.env.SMTP_PASSWORD,
  EMAIL_FROM: process.env.EMAIL_FROM,
  UPLOADTHING_SECRET: process.env.UPLOADTHING_SECRET,
};

// Validate
const serverEnv = serverSchema.safeParse(processEnv);
const clientEnv = clientSchema.safeParse(processEnv);

if (!serverEnv.success) {
  console.error("❌ Invalid server environment variables:");
  console.error(serverEnv.error.flatten().fieldErrors);
  throw new Error("Invalid server environment variables");
}

if (!clientEnv.success) {
  console.error("❌ Invalid client environment variables:");
  console.error(clientEnv.error.flatten().fieldErrors);
  throw new Error("Invalid client environment variables");
}

export const env = {
  ...serverEnv.data,
  ...clientEnv.data,
};
