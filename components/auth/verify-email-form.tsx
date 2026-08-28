"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { toast } from "@/components/ui/toast";
import { sendVerificationOtp, verifyEmailOtp } from "@/lib/actions/auth";

const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmailForm({ email }: { email: string }) {
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

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
    if (isVerifying) return;
    setIsVerifying(true);
    try {
      const result = await verifyEmailOtp(code);
      if (!result.success) {
        toast.add({
          type: "error",
          title: "Verification failed",
          description: result.message,
        });
        setOtp("");
        return;
      }
      toast.add({
        type: "success",
        title: "Email verified",
        description: "Welcome to Handoff!",
      });
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.add({
        type: "error",
        title: "Something went wrong",
        description: "Please try again.",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = useCallback(async () => {
    if (isResending || cooldown > 0) return;
    setIsResending(true);
    try {
      const result = await sendVerificationOtp();
      if (!result.success) {
        toast.add({
          type: "error",
          title: "Couldn't resend code",
          description: result.message,
        });
        return;
      }
      setCooldown(RESEND_COOLDOWN_SECONDS);
      toast.add({
        type: "success",
        title: "Code sent",
        description: result.message,
      });
    } catch {
      toast.add({
        type: "error",
        title: "Something went wrong",
        description: "Please try again.",
      });
    } finally {
      setIsResending(false);
    }
  }, [isResending, cooldown]);

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

        <Button type="submit" disabled={otp.length !== 6 || isVerifying}>
          {isVerifying ? (
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
          disabled={cooldown > 0 || isResending}
        >
          {cooldown > 0
            ? `Resend in ${cooldown}s`
            : isResending
              ? "Sending…"
              : "Resend code"}
        </Button>
      </p>
    </div>
  );
}
