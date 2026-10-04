import type { Metadata } from "next";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import LoginForm from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Handoff account",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <AuthPageShell
      eyebrow="Welcome back"
      title="Pick up where you left off."
      description="Sign in to see what is moving across your clients and projects."
      alternatePrompt="New to Handoff?"
      alternateLabel="Create your free workspace"
      alternateHref="/register"
    >
      <LoginForm />
    </AuthPageShell>
  );
}
