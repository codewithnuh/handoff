"use client";

import { useActionState } from "react";
import { login } from "@/lib/actions/auth";
import type { LoginResult } from "@/lib/actions/auth";
import type { ActionResponseType } from "@/lib/types/action";

type LoginState = ActionResponseType<LoginResult> | null;

/**
 * Wraps the `login` server action so it can be driven by a native HTML form.
 * Reads the raw FormData and hands a validated payload to the server action.
 */
async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  return login({ email, password });
}

export default function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, null);

  return (
    <form
      action={formAction}
      className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
    >
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
          className="rounded-lg border border-zinc-300 px-3 py-2 text-black text-sm outline-none focus:border-zinc-500"
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
          autoComplete="current-password"
          placeholder="••••••••"
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
        {isPending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
