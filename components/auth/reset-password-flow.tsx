"use client";

import { useSyncExternalStore } from "react";
import { CircleAlert } from "lucide-react";

import NewPasswordForm from "@/components/auth/new-password-form";
import ResetPasswordForm from "@/components/auth/reset-password-form";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const emptySubscribe = () => () => {};

/**
 * Better Auth reset links carry their token in the URL hash
 * (`/reset-password#token=...`), which never reaches the server.
 * This client wrapper inspects the hash after hydration and shows either
 * the request form or the choose-new-password step.
 */
export default function ResetPasswordFlow() {
  // Two-pass render: false on the server + first client pass (matching
  // SSR output), true afterwards — avoids any hydration mismatch.
  const hydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  if (!hydrated) return null;

  const token = new URLSearchParams(window.location.hash.slice(1)).get("token");
  if (token) return <NewPasswordForm token={token} />;

  // Link opened without a token — expired or manually truncated.
  if (window.location.search.includes("verify=true")) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Reset link invalid</CardTitle>
          <CardDescription>
            This password-reset link is missing its security token.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <CircleAlert />
            <AlertTitle>
              Request a new link below — links expire shortly and can only be
              used once.
            </AlertTitle>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return <ResetPasswordForm />;
}
