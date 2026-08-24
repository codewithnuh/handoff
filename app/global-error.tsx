"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IconAlertOctagon } from "@tabler/icons-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Log to external error reporting service in production
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <div className="flex min-h-screen items-center justify-center p-4">
          <Card className="shadow-xs w-full max-w-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-destructive">
                Something went wrong
              </CardTitle>
              <IconAlertOctagon className="size-4 text-destructive" />
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                An unexpected error occurred. This has been logged and our team
                has been notified.
              </p>
              {error.digest && (
                <p className="font-mono text-[10px] text-muted-foreground">
                  Error ID: {error.digest}
                </p>
              )}
              {process.env.NODE_ENV === "development" && error.message && (
                <div className="rounded-md bg-muted p-3">
                  <p className="text-xs font-mono text-muted-foreground break-all">
                    {error.message}
                  </p>
                  {error.stack && (
                    <pre className="mt-2 max-h-40 overflow-auto text-[10px] text-muted-foreground whitespace-pre-wrap">
                      {error.stack}
                    </pre>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={reset}>
                  Try again
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/dashboard")}
                >
                  Go to dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </body>
    </html>
  );
}
