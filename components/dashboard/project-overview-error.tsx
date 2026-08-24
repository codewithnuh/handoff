"use client";

import { IconAlertOctagon } from "@tabler/icons-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ProjectOverviewErrorProps {
  message?: string;
}

export function ProjectOverviewError({
  message = "Failed to load dashboard overview.",
}: ProjectOverviewErrorProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card className="shadow-xs" key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-destructive">
              Error
            </CardTitle>
            <IconAlertOctagon className="size-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{message}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="mt-3"
            >
              Try again
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
