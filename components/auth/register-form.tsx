"use client";

import { useActionState } from "react";

import { register } from "@/lib/actions/auth";
import type { RegisterResult } from "@/lib/actions/auth";
import type { ActionResponseType } from "@/lib/types/action";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type RegisterState = ActionResponseType<RegisterResult> | null;

/**
 * Wraps the register server action so it can be driven by a native HTML form.
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
      className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Name</Label>

        <Input
          id="name"
          name="name"
          type="text"
          required
          autoComplete="name"
          placeholder="Jane Doe"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>

        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>

        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="At least 8 characters"
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

      <Button type="submit" disabled={isPending}>
        {isPending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
