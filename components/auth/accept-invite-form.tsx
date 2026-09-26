"use client";

/**
 * AcceptInviteForm — completes a team invitation.
 * - Signed in with the invited email: one-click accept.
 * - Signed out: sets name + password (this IS the sign-up — no separate form).
 * - Signed in with the wrong account: pointed at /login.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { acceptTeamInvite } from "@/lib/actions/team";
import { useServerAction } from "@/hooks/use-server-action";

interface AcceptInviteFormProps {
  token: string;
  email: string;
  viewerEmail: string | null;
  emailMatches: boolean;
  /** Invited email already has a Handoff account — never offer a new password */
  hasAccount: boolean;
}

export function AcceptInviteForm({
  token,
  email,
  viewerEmail,
  emailMatches,
  hasAccount,
}: AcceptInviteFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const accept = useServerAction(acceptTeamInvite, {
    success: (_d, m) => m,
    failure: "Couldn't join",
    onError: (e) => setFieldErrors(e.fieldErrors ?? {}),
    onSuccess: () => router.push("/dashboard"),
  });

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (accept.pending) return;

    // Wrong account → send to login with a next hop back here
    if (viewerEmail && !emailMatches) return;

    const needsAccount = !viewerEmail;
    if (needsAccount && (!name.trim() || password.length < 8)) {
      setFieldErrors({
        ...(name.trim() ? {} : { name: ["Name is required"] }),
        ...(password.length >= 8
          ? {}
          : { password: ["Password must be at least 8 characters"] }),
      });
      return;
    }

    setFieldErrors({});
    await accept.run({
      token,
      name: name.trim() || undefined,
      password: password || undefined,
    });
  };

  if (viewerEmail && !emailMatches) {
    return (
      <div className="space-y-4 rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">
          You&apos;re signed in as{" "}
          <span className="font-medium text-foreground">{viewerEmail}</span>,
          but this invite is for{" "}
          <span className="font-medium text-foreground">{email}</span>.
        </p>
        <Button render={<Link href="/login" />}>Sign in with the invited email</Button>
      </div>
    );
  }

  // Existing account, viewed while signed out: keep THEIR password.
  // They sign in first, then reopen this link to accept in one click.
  if (!viewerEmail && hasAccount) {
    return (
      <div className="space-y-4 rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{email}</span>{" "}
          already has a Handoff account — no new password needed.
        </p>
        <ol className="text-xs text-muted-foreground space-y-1 text-left list-decimal list-inside">
          <li>Sign in with your existing password</li>
          <li>Come back to this page (reopen the invite link)</li>
          <li>Click accept — you&apos;re in</li>
        </ol>
        <Button
          className="w-full"
          render={<Link href="/login" />}
        >
          Sign in to accept
        </Button>
      </div>
    );
  }

  if (viewerEmail && emailMatches) {
    return (
      <div className="space-y-4 rounded-lg border border-border bg-card p-6">
        <Button className="w-full" onClick={() => handleSubmit()} disabled={accept.pending}>
          {accept.pending ? "Joining…" : `Accept invite & open dashboard`}
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border border-border bg-card p-6"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="accept-name">Your name</Label>
        <Input
          id="accept-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Jane Cooper"
          required
          aria-required
        />
        {fieldErrors.name && (
          <p role="alert" className="text-xs text-destructive">
            {fieldErrors.name.join(", ")}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="accept-email">Email</Label>
        <Input id="accept-email" value={email} disabled />
        <p className="text-[10px] text-muted-foreground">
          This is the email your invite was sent to.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="accept-password">Create a password</Label>
        <Input
          id="accept-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          required
          aria-required
          minLength={8}
        />
        {fieldErrors.password && (
          <p role="alert" className="text-xs text-destructive">
            {fieldErrors.password.join(", ")}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={accept.pending}>
        {accept.pending ? "Setting up…" : "Join workspace"}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        This creates your Handoff account using the invited email.
      </p>
    </form>
  );
}
