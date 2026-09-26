"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ErrorPanel } from "@/components/presentational/error-panel";

export default function ClientsError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your workspace clients and their project access.
          </p>
        </div>
      </div>
      <ErrorPanel
        error={error}
        retry={retry}
        logLabel="Clients page error:"
        title="Failed to load clients"
        description="We couldn&apos;t load your clients. Please try again."
        secondary={
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              Back to dashboard
            </Button>
          </Link>
        }
      />
    </div>
  );
}
