import type { Metadata } from "next";
import Link from "next/link";
import LoginForm from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Handoff account",
};

export default function LoginPage() {
  return (
    <main className="bg-background flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16">
      <LoginForm />

      <p className="text-muted-foreground text-sm">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="text-foreground font-medium underline-offset-4 hover:underline"
        >
          Create one
        </Link>
      </p>
    </main>
  );
}
