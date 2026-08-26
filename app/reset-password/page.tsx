import type { Metadata } from "next";
import ResetPasswordForm from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Handoff account",
};

export default function ResetPassword() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-background px-4 py-16">
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Request Password Reset
        </h1>
        <p className="text-sm text-zinc-500">
          Enter your email to receive password reset instruction.
        </p>
      </div>

      <ResetPasswordForm />
    </main>
  );
}
