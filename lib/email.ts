import "server-only";

import nodemailer, { type Transporter } from "nodemailer";

import { env } from "@/env";

export type EmailPayload = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
};

const isSmtpConfigured = Boolean(
  env.SMTP_HOST && env.SMTP_PORT && env.EMAIL_FROM,
);

let transporter: Transporter | null = null;

/**
 * Lazily create the SMTP transport. A single pooled connection is reused
 * across emails to avoid repeated TLS handshakes on serverless platforms.
 */
const getTransporter = (): Transporter => {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth:
      env.SMTP_USER && env.SMTP_PASSWORD
        ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
        : undefined,
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
  });

  return transporter;
};

const logEmailToConsole = (payload: EmailPayload): void => {
  const body = payload.text ?? payload.html ?? "";
  console.log(
    `\n📧 [EMAIL] To: ${payload.to}\n   Subject: ${payload.subject}\n   ${body}\n`,
  );
};

/**
 * Sends an email through the configured SMTP transport.
 *
 * In development without SMTP configuration, emails are logged to the
 * console so flows remain testable. In production, a missing transport
 * throws — verification / reset emails must never be silently dropped.
 */
export const sendEmail = async (payload: EmailPayload): Promise<void> => {
  if (!isSmtpConfigured) {
    if (env.NODE_ENV === "production") {
      throw new Error(
        "Email transport is not configured for production. " +
          "Set SMTP_HOST, SMTP_PORT and EMAIL_FROM.",
      );
    }
    logEmailToConsole(payload);
    return;
  }

  await getTransporter().sendMail({
    from: env.EMAIL_FROM,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  });
};

// ──────────────────────────────────────────────
// Branded HTML templates
// ──────────────────────────────────────────────

const layout = (content: string): string => `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background-color:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafafa;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e4e4e7;">
            <tr>
              <td style="padding-bottom:24px;">
                <span style="font-size:18px;font-weight:700;color:#18181b;letter-spacing:-0.02em;">Handoff</span>
              </td>
            </tr>
            <tr>
              <td>${content}</td>
            </tr>
            <tr>
              <td style="padding-top:24px;border-top:1px solid #e4e4e7;margin-top:24px;">
                <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.5;">
                  If you didn't request this email, you can safely ignore it.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

const button = (url: string, label: string): string =>
  `<a href="${url}" style="display:inline-block;background-color:#18181b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;">${label}</a>`;

export const verificationEmailHtml = (url: string): string =>
  layout(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#18181b;">Verify your email</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#52525b;line-height:1.6;">
      Welcome to Handoff! Confirm your email address to activate your account and start managing projects.
    </p>
    ${button(url, "Verify Email")}
    <p style="margin:16px 0 0;font-size:12px;color:#a1a1aa;">This link expires in 1 hour.</p>
  `);

export const resetPasswordEmailHtml = (url: string): string =>
  layout(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#18181b;">Reset your password</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#52525b;line-height:1.6;">
      We received a request to reset your password. Click below to choose a new one.
    </p>
    ${button(url, "Reset Password")}
    <p style="margin:16px 0 0;font-size:12px;color:#a1a1aa;">This link expires shortly and can only be used once.</p>
  `);

export const otpEmailHtml = (
  otp: string,
  purpose: string,
  minutes: number,
): string =>
  layout(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#18181b;">Your verification code</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#52525b;line-height:1.6;">
      Use this code to complete ${purpose}:
    </p>
    <div style="margin:0 0 24px;">
      <span style="display:inline-block;font-size:28px;font-weight:700;letter-spacing:8px;color:#18181b;background:#f4f4f5;border:1px solid #e4e4e7;border-radius:8px;padding:12px 20px;">${otp}</span>
    </div>
    <p style="margin:0;font-size:12px;color:#a1a1aa;">This code expires in ${minutes} minutes.</p>
  `);

export const teamInviteEmailHtml = (
  inviterName: string,
  workspaceName: string,
  acceptUrl: string,
): string =>
  layout(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#18181b;">You've been invited</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#52525b;line-height:1.6;">
      <strong>${inviterName}</strong> invited you to collaborate in <strong>${workspaceName}</strong> on Handoff.
    </p>
    ${button(acceptUrl, "Accept Invitation")}
    <p style="margin:16px 0 0;font-size:12px;color:#a1a1aa;">This invitation expires in 7 days.</p>
  `);
