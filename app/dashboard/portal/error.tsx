"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IconAlertOctagon } from "@tabler/icons-react";

export default function PortalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("Portal page error:", error);
  }, [error]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Portal</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage client portal access.
          </p>
        </div>
      </div>
      <Card className="shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-destructive">
            Failed to load portal data
          </CardTitle>
          <IconAlertOctagon className="size-4 text-destructive" />
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            We couldn&apos;t load your portal data. Please try again.
            {error.digest && (
              <span className="block mt-1 font-mono text-[10px]">
                Error ID: {error.digest}
              </span>
            )}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={retry}>
              Try again
            </Button>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-md text-xs/relaxed font-medium h-6 px-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Back to dashboard
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
