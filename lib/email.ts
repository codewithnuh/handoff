export type EmailPayload = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
};

/**
 * Development-only email transport.
 *
 * Logs the email to the console instead of delivering it. Swap this function
 * with a real provider (Resend, SES, Postmark, ...) once credentials are
 * available — the Better Auth config in `lib/auth.ts` is the only caller.
 */
export const sendEmail = async (payload: EmailPayload): Promise<void> => {
  if (process.env.NODE_ENV === "production") {
    // Never silently drop verification / reset emails in production.
    throw new Error(
      "Email transport is not configured for production. " +
        "Replace lib/email.ts with a real provider (Resend, SES, Postmark, ...).",
    );
  }
  const body = payload.text ?? payload.html ?? "";
  console.log(
    `\n📧 [EMAIL] To: ${payload.to}\n   Subject: ${payload.subject}\n   ${body}\n`,
  );
};
