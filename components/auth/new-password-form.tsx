"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert } from "lucide-react";

import { resetPassword } from "@/lib/actions/auth";
import type { ActionError } from "@/lib/types/action";

import {
  Alert,
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
import { PasswordField } from "@/components/auth/password-field";

/** Final step of the password-reset flow: choose a new password. */
export default function NewPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<ActionError | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isPending) return;

    if (newPassword !== confirmPassword) {
      setError({
        success: false,
        message: "Passwords do not match",
        error: { code: "VALIDATION_ERROR" },
      });
      return;
    }

    setIsPending(true);
    setError(null);
    try {
      const result = await resetPassword({ newPassword, token });
      if (!result.success) {
        setError(result);
        return;
      }
      router.push("/login");
      router.refresh();
    } catch {
      setError({
        success: false,
        message: "Something went wrong. Please try again.",
        error: { code: "INTERNAL_ERROR" },
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Choose a new password</CardTitle>
        <CardDescription>
          Pick a strong password you haven&apos;t used before.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <PasswordField
            id="newPassword"
            label="New password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={newPassword}
            onChange={setNewPassword}
          />
          <PasswordField
            id="confirmPassword"
            label="Confirm password"
            autoComplete="new-password"
            placeholder="Repeat your new password"
            value={confirmPassword}
            onChange={setConfirmPassword}
          />

          {error && (
            <Alert variant="destructive">
              <CircleAlert />
              <AlertTitle>{error.message}</AlertTitle>
            </Alert>
          )}

          <Button
            type="submit"
            size="lg"
            disabled={isPending}
            className="w-full"
          >
            {isPending ? "Resetting…" : "Reset password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
