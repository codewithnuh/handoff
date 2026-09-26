"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { sendVerificationOtp, verifyEmailOtp } from "@/lib/actions/auth";
import { useServerAction } from "@/hooks/use-server-action";

const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmailForm({ email }: { email: string }) {
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const verify = useServerAction(verifyEmailOtp, {
    success: "Email verified",
    successDescription: () => "Welcome to Handoff!",
    failure: "Verification failed",
    onError: () => setOtp(""),
    onSuccess: () => router.push("/dashboard"),
  });

  const resend = useServerAction(sendVerificationOtp, {
    success: "Code sent",
    successDescription: (_data, message) => message,
    failure: "Couldn't resend code",
    refresh: false,
    onSuccess: () => setCooldown(RESEND_COOLDOWN_SECONDS),
  });

  // Tick down the resend cooldown once per second.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(
      () => setCooldown((s) => Math.max(0, s - 1)),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const handleVerify = async (code: string) => {
    if (verify.pending) return;
    await verify.run(code);
  };

  const handleResend = () => {
    if (resend.pending || cooldown > 0) return;
    void resend.run();
  };

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-6">
      <p className="text-muted-foreground text-sm">
        We sent a 6-digit code to{" "}
        <span className="text-foreground font-medium">{email}</span>. Enter it
        below to verify your account.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleVerify(otp);
        }}
        className="flex w-full flex-col items-center gap-4"
      >
        <InputOTP
          maxLength={6}
          value={otp}
          onChange={(value) => setOtp(value)}
          onComplete={(value) => void handleVerify(value)}
          autoFocus
          aria-label="Verification code"
          pattern="^\d{6}$"
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
          </InputOTPGroup>
          <InputOTPSeparator />
          <InputOTPGroup>
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>

        <Button type="submit" disabled={otp.length !== 6 || verify.pending}>
          {verify.pending ? (
            <>
              <Loader2 className="animate-spin" data-icon="inline-start" />
              Verifying…
            </>
          ) : (
            "Verify email"
          )}
        </Button>
      </form>

      <p className="text-muted-foreground text-sm">
        Didn&apos;t receive a code?{" "}
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto p-0"
          onClick={() => void handleResend()}
          disabled={cooldown > 0 || resend.pending}
        >
          {cooldown > 0
            ? `Resend in ${cooldown}s`
            : resend.pending
              ? "Sending…"
              : "Resend code"}
        </Button>
      </p>
    </div>
  );
}
