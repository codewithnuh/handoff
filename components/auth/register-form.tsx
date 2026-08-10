"use client";

import { useActionState } from "react";
import { register } from "@/lib/actions/auth";
import type { RegisterResult } from "@/lib/actions/auth";
import type { ActionResponseType } from "@/lib/types/action";

type RegisterState = ActionResponseType<RegisterResult> | null;

/**
 * Wraps the `register` server action so it can be driven by a native HTML form.
 * Reads the raw FormData and hands a validated payload to the server action.
 */
async function registerAction(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const name = String(formData.get("name") ?? "");
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  return register({ name, email, password });
}

export default function RegisterForm() {
  const [state, formAction, isPending] = useActionState(registerAction, null);

  return (
    <form
      action={formAction}
      className="flex w-full text-black max-w-sm flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium text-zinc-700">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          autoComplete="name"
          placeholder="Jane Doe"
          className="rounded-lg border text-black border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-zinc-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-zinc-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="At least 8 characters"
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
        />
      </div>

      {state?.success && (
        <p role="status" className="text-sm font-medium text-green-600">
          {state.message}
        </p>
      )}

      {state && !state.success && (
        <div className="flex flex-col gap-1">
          <p role="alert" className="text-sm font-medium text-red-600">
            {state.message}
          </p>
          {state.error.fieldErrors &&
            Object.entries(state.error.fieldErrors).map(([field, messages]) => (
              <p key={field} className="text-xs text-red-500">
                {field}: {messages.join(", ")}
              </p>
            ))}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
