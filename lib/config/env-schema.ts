import { z } from "zod";

const emptyToUndefined = (value: unknown): unknown =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalText = z.preprocess(
  (value) =>
    typeof value === "string" ? value.trim() || undefined : emptyToUndefined(value),
  z.string().min(1).optional(),
);

const optionalPort = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.coerce.number().int().min(1).max(65535).optional(),
);

const isHttpUrl = (value: string): boolean => {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

const isPostgresUrl = (value: string): boolean => {
  try {
    return ["postgres:", "postgresql:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

const httpUrl = z.string().trim().url().refine(isHttpUrl, {
  message: "must use the http or https protocol",
});

const isEmailAddress = (value: string): boolean => {
  const match = /^[^<>]*<([^<>]+)>$/.exec(value);
  return z.email().safeParse(match?.[1] ?? value).success;
};

const emailFrom = optionalText.refine(
  (value) => value === undefined || isEmailAddress(value),
  { message: "must be an email address or Name <email>" },
);

const uploadThingToken = optionalText.refine(
  (value) => {
    if (value === undefined) return true;

    try {
      const decoded = Buffer.from(value, "base64").toString("utf8");
      const canonical = Buffer.from(decoded, "utf8")
        .toString("base64")
        .replace(/=+$/, "");
      if (canonical !== value.replace(/=+$/, "")) return false;

      const token: unknown = JSON.parse(decoded);
      if (!token || typeof token !== "object") return false;

      const fields = token as Record<string, unknown>;
      return (
        typeof fields.apiKey === "string" &&
        fields.apiKey.startsWith("sk_") &&
        typeof fields.appId === "string" &&
        fields.appId.length > 0 &&
        Array.isArray(fields.regions) &&
        fields.regions.length > 0 &&
        fields.regions.every(
          (region) => typeof region === "string" && region.length > 0,
        ) &&
        (fields.ingestHost === undefined ||
          (typeof fields.ingestHost === "string" &&
            fields.ingestHost.length > 0))
      );
    } catch {
      return false;
    }
  },
  { message: "must be a valid UploadThing token from the UploadThing dashboard" },
);

const serverSchema = z
  .object({
    DATABASE_URL: z
      .string()
      .trim()
      .url()
      .refine(isPostgresUrl, {
        message: "must be a PostgreSQL connection URL",
      }),
    AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: httpUrl,
    NODE_ENV: z.enum(["development", "test", "production"]),
    SMTP_HOST: optionalText,
    SMTP_PORT: optionalPort,
    SMTP_USER: optionalText,
    SMTP_PASSWORD: optionalText,
    EMAIL_FROM: emailFrom,
    UPLOADTHING_TOKEN: uploadThingToken,
  })
  .superRefine((config, context) => {
    if (Boolean(config.SMTP_USER) !== Boolean(config.SMTP_PASSWORD)) {
      context.addIssue({
        code: "custom",
        path: [config.SMTP_USER ? "SMTP_PASSWORD" : "SMTP_USER"],
        message: "must be set together with the other SMTP authentication field",
      });
    }

    if (config.NODE_ENV !== "production") return;

    for (const key of ["AUTH_SECRET", "BETTER_AUTH_SECRET"] as const) {
      const secret = config[key];
      const looksLikePlaceholder =
        /^(?:replace|change[-_ ]?me|example|placeholder|your[-_ ]|test[-_ ]|ci[-_ ]|development[-_ ]|password)/i.test(
          secret,
        );
      if (looksLikePlaceholder || new Set(secret).size < 12) {
        context.addIssue({
          code: "custom",
          path: [key],
          message: "must be a unique, randomly generated production secret",
        });
      }
    }

    if (config.AUTH_SECRET === config.BETTER_AUTH_SECRET) {
      context.addIssue({
        code: "custom",
        path: ["BETTER_AUTH_SECRET"],
        message: "must differ from AUTH_SECRET",
      });
    }

    for (const key of ["SMTP_HOST", "SMTP_PORT", "EMAIL_FROM"] as const) {
      if (config[key] === undefined) {
        context.addIssue({
          code: "custom",
          path: [key],
          message: "is required in production",
        });
      }
    }

    if (config.UPLOADTHING_TOKEN === undefined) {
      context.addIssue({
        code: "custom",
        path: ["UPLOADTHING_TOKEN"],
        message: "is required in production",
      });
    }
  });

const publicSchema = z.object({ NEXT_PUBLIC_APP_URL: httpUrl });

export const parseServerEnvironment = (input: Record<string, string | undefined>) =>
  serverSchema.safeParse(input);

export const parsePublicEnvironment = (input: Record<string, string | undefined>) =>
  publicSchema.safeParse(input);

export function describeEnvironmentErrors(
  scope: string,
  error: z.ZodError,
): string {
  const issues = error.issues
    .map((issue) => `${issue.path.join(".") || "environment"}: ${issue.message}`)
    .join("; ");
  return `Invalid ${scope} environment configuration: ${issues}`;
}
