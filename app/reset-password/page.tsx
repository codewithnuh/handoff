import type { Metadata } from "next";
import Link from "next/link";

import ResetPasswordFlow from "@/components/auth/reset-password-flow";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Reset your Handoff account password",
};

export default function ResetPasswordPage() {
  return (
    <main className="bg-background flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16">
      <ResetPasswordFlow />

      <p className="text-muted-foreground text-sm">
        Remembered it?{" "}
        <Link
          href="/login"
          className="text-foreground font-medium underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </main>
  );
}
