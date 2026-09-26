"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { ErrorPanel } from "@/components/presentational/error-panel";

export default function ProjectDetailError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <nav className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link
          href="/dashboard/projects"
          className="hover:text-foreground transition-colors"
        >
          Projects
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="font-medium text-foreground">Error</span>
      </nav>
      <ErrorPanel
        error={error}
        retry={retry}
        logLabel="Project detail error:"
        title="Failed to load project"
        description="We couldn&apos;t load this project. It may have been removed, or you may not have access to it."
        secondary={
          <Link href="/dashboard/projects">
            <Button variant="ghost" size="sm">
              Back to projects
            </Button>
          </Link>
        }
      />
    </div>
  );
}
