import type { Metadata } from "next";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import RegisterForm from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create a Handoff account",
};

export default function RegisterPage() {
  return (
    <AuthPageShell
      eyebrow="Start with Handoff"
      title="Make room for your best work."
      description="Create a workspace for your clients, projects, and the details that keep everything moving."
      alternatePrompt="Already have a workspace?"
      alternateLabel="Sign in"
      alternateHref="/login"
    >
      <RegisterForm />
    </AuthPageShell>
  );
}
