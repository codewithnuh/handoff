"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ErrorPanel } from "@/components/presentational/error-panel";

export default function ProjectsError({
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
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your workspace projects, deliverable status, and client
            access.
          </p>
        </div>
      </div>
      <ErrorPanel
        error={error}
        retry={retry}
        logLabel="Projects page error:"
        title="Failed to load projects"
        description="We couldn&apos;t load your projects. This might be a network issue or a temporary server problem."
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
