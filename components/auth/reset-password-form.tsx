"use client";

import { useActionState } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";

import { requestPasswordReset } from "@/lib/actions/auth";
import type { PasswordResetResult } from "@/lib/actions/auth";
import type { ActionResponseType } from "@/lib/types/action";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type RequestPasswordResetState = ActionResponseType<PasswordResetResult> | null;

/**
 * Wraps the request-password-reset server action so it can be driven by a
 * native HTML form.
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
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Forgot your password?</CardTitle>
        <CardDescription>
          Enter your email and we&apos;ll send you a link to reset it.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {state?.success && (
          <Alert variant="success">
            <CircleCheck />
            <AlertTitle>Check your inbox</AlertTitle>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        )}

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
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

          {state && !state.success && (
            <Alert variant="destructive">
              <CircleAlert />
              <AlertTitle>{state.message}</AlertTitle>
              {state.error.fieldErrors && (
                <AlertDescription>
                  {Object.entries(state.error.fieldErrors).map(
                    ([field, messages]) => (
                      <span key={field}>
                        {field}: {messages.join(", ")}
                      </span>
                    ),
                  )}
                </AlertDescription>
              )}
            </Alert>
          )}

          <Button
            type="submit"
            size="lg"
            disabled={isPending}
            className="w-full"
          >
            {isPending ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
