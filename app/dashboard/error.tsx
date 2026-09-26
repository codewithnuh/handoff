"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ErrorPanel } from "@/components/presentational/error-panel";

export default function DashboardError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <ErrorPanel
        error={error}
        retry={retry}
        logLabel="Dashboard error:"
        title="Something went wrong"
        description="An unexpected error occurred while loading the dashboard. This might be a temporary issue."
        secondary={
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Re-login
            </Button>
          </Link>
        }
      />
    </div>
  );
}
