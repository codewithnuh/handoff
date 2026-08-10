import { z } from "zod";
import "dotenv/config";
const serverSchema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(1),
  NODE_ENV: z.enum(["development", "test", "production"]),
});

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

const processEnv = {
  DATABASE_URL: process.env.DATABASE_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
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
