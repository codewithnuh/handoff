import type { Metadata } from "next";
import Link from "next/link";
import RegisterForm from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create a Handoff account",
};

export default function RegisterPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 px-4 py-16">
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-semibold text-zinc-900">Create account</h1>
        <p className="text-sm text-zinc-500">
          Register a new Handoff account to test sign-up.
        </p>
      </div>

      <RegisterForm />

      <p className="text-sm text-zinc-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-zinc-900 underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
