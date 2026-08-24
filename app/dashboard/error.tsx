"use client";

import { useEffect } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IconAlertOctagon } from "@tabler/icons-react";
import Link from "next/link";

export default function DashboardError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="md:hidden" />
      </div>
      <Card className="shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-destructive">
            Something went wrong
          </CardTitle>
          <IconAlertOctagon className="size-4 text-destructive" />
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            An unexpected error occurred while loading the dashboard. This
            might be a temporary issue.
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
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Re-login
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
