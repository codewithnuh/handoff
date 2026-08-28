"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert } from "lucide-react";

import { register } from "@/lib/actions/auth";
import type { RegisterResult } from "@/lib/actions/auth";
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
  const router = useRouter();

  // Route to email verification once the account + session exist
  useEffect(() => {
    if (state?.success && state.data) {
      router.push("/verify-email");
      router.refresh();
    }
  }, [state, router]);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Create account</CardTitle>
        <CardDescription>
          Start managing clients and projects in minutes.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
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

          <PasswordField
            id="password"
            label="Password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
          />

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
            {isPending ? "Creating account…" : "Create account"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
