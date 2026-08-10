import type { Metadata } from "next";
import Link from "next/link";
import LoginForm from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Handoff account",
};

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 px-4 py-16">
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-semibold text-zinc-900">Sign in</h1>
        <p className="text-sm text-zinc-500">
          Enter your credentials to log in to Handoff.
        </p>
      </div>

      <LoginForm />

      <p className="text-sm text-zinc-500">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-zinc-900 underline">
          Create one
        </Link>
      </p>
    </main>
  );
}
