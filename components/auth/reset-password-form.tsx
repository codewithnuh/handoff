"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "@/lib/actions/auth";
import type { PasswordResetResult } from "@/lib/actions/auth";
import type { ActionResponseType } from "@/lib/types/action";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";

type RequestPasswordResetState = ActionResponseType<PasswordResetResult> | null;

/**
 * Wraps the `login` server action so it can be driven by a native HTML form.
 * Reads the raw FormData and hands a validated payload to the server action.
 */
async function requestPasswordResetAction(
  _prev: RequestPasswordResetState,
  formData: FormData,
): Promise<RequestPasswordResetState> {
  const email = String(formData.get("email") ?? "");

  return requestPasswordReset({ email });
}

export default function ResetPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    requestPasswordResetAction,
    null,
  );

  return (
    <form
      action={formAction}
      className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-zinc-200 bg-background p-6 shadow-sm"
    >
      <div className="flex flex-col gap-1">
        <Label htmlFor="email" className="text-sm font-medium text-zinc-700">
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="rounded-lg border border-zinc-300 px-3 py-2 text-black text-sm outline-none focus:border-zinc-500"
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

      <Button type="submit" disabled={isPending} className="">
        {isPending ? "Requesting.." : "Request Reset"}
      </Button>
    </form>
  );
}
