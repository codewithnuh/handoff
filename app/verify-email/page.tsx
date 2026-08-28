import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { MailCheck } from "lucide-react";

import VerifyEmailForm from "@/components/auth/verify-email-form";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Verify your email",
  description: "Confirm your email address to finish setting up Handoff",
};

export default async function VerifyEmailPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) redirect("/login");
  if (session.user.emailVerified) redirect("/dashboard");

  return (
    <main className="bg-background flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full">
          <MailCheck className="size-6" />
        </span>
        <h1 className="text-2xl font-semibold">Check your inbox</h1>
      </div>

      <VerifyEmailForm email={session.user.email} />

      <p className="text-muted-foreground max-w-sm text-center text-xs">
        Wrong address or want to use a different account? Sign out and register
        again with the correct email.
      </p>
    </main>
  );
}
