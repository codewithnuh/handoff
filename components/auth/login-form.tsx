"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CircleAlert } from "lucide-react";

import { login } from "@/lib/actions/auth";
import type { LoginResult } from "@/lib/actions/auth";
import type { ActionResponseType } from "@/lib/types/action";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { PasswordField } from "@/components/auth/password-field";

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
  const router = useRouter();

  // Route based on verification status: unverified accounts must confirm
  // their email before entering the app.
  useEffect(() => {
    if (state?.success && state.data) {
      const destination = state.data.user.emailVerified
        ? "/dashboard"
        : "/verify-email";
      router.push(destination);
      router.refresh();
    }
  }, [state, router]);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          Enter your credentials to access your Handoff account.
        </CardDescription>
      </CardHeader>

      <CardContent>
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

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/reset-password"
                tabIndex={-1}
                className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <PasswordField
              id="password"
              autoComplete="current-password"
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
            {isPending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
