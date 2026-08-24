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
import { ChevronRight } from "lucide-react";
import { IconAlertOctagon } from "@tabler/icons-react";

export default function ProjectDetailError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("Project detail error:", error);
  }, [error]);

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
      <Card className="shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-destructive">
            Failed to load project
          </CardTitle>
          <IconAlertOctagon className="size-4 text-destructive" />
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            We couldn&apos;t load this project. It may have been removed, or
            you may not have access to it.
          </p>
          {error.digest && (
            <p className="font-mono text-[10px] text-muted-foreground">
              Error ID: {error.digest}
            </p>
          )}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={retry}>
              Try again
            </Button>
            <Link href="/dashboard/projects">
              <Button variant="ghost" size="sm">
                Back to projects
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
