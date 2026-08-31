import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins/email-otp";
import { env } from "@/env";
import { db } from "@/lib/prisma";
import { INVITE_TTL_SECONDS } from "@/lib/constants/invitations";
import {
  otpEmailHtml,
  resetPasswordEmailHtml,
  sendEmail,
  verificationEmailHtml,
} from "@/lib/email";

export const auth = betterAuth({
  appName: "Handoff",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(db, { provider: "postgresql" }),
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await db.subscription.create({
            data: {
              userId: user.id,
              plan: "FREE",
              status: "ACTIVE",
            },
          });
        },
      },
    }
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    // Fires when a user requests a password reset.
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your password",
        text: `Click the link to reset your password: ${url}`,
        html: resetPasswordEmailHtml(url),
      });
    },
  },
  emailVerification: {
    // Sign-up uses the email-otp plugin below (6-digit codes) instead of links.
    sendOnSignUp: false,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      // Fallback path (e.g. resendVerificationEmail link flow).
      await sendEmail({
        to: user.email,
        subject: "Verify your email address",
        text: `Click the link to verify your email: ${url}`,
        html: verificationEmailHtml(url),
      });
    },
  },
  session: {
    expiresIn: INVITE_TTL_SECONDS,
    updateAge: 60 * 60 * 24, // refresh every 24 hours
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 60,
    // Tighter budgets on brute-force-prone auth endpoints.
    customRules: {
      "/api/auth/sign-in/email": { window: 60, max: 5 },
      "/api/auth/sign-up/email": { window: 60, max: 3 },
      "/api/auth/request-password-reset": { window: 60, max: 5 },
      "/api/auth/reset-password": { window: 60, max: 5 },
    },
  },
  advanced: {
    useSecureCookies: env.NODE_ENV === "production",
    defaultCookieAttributes: {
      sameSite: "lax",
    },
  },
  plugins: [
    emailOTP({
      // 6-digit codes valid for 10 minutes, max 5 attempts, stored hashed.
      otpLength: 6,
      expiresIn: 600,
      allowedAttempts: 5,
      storeOTP: "hashed",
      // Sends an OTP automatically right after sign-up so the user can
      // verify immediately on /verify-email.
      sendVerificationOnSignUp: true,
      sendVerificationOTP: async ({ email, otp }) => {
        await sendEmail({
          to: email,
          subject: "Your Handoff verification code",
          text: `Your verification code is ${otp}. It expires in 10 minutes.`,
          html: otpEmailHtml(otp, "verifying your email", 10),
        });
      },
    }),
    // nextCookies must be last so other plugins' Set-Cookie headers are forwarded
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
export type AuthUser = Session["user"];
