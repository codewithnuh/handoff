"use client";

import { useEffect, type ReactNode } from "react";
import { IconAlertOctagon } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ErrorPanel({
  error,
  title,
  description,
  logLabel,
  retry,
  actions,
  secondary,
  contentClassName = "space-y-4",
}: {
  error: Error & { digest?: string };
  title: string;
  description: ReactNode;
  logLabel: string;
  retry?: () => void;
  actions?: ReactNode;
  secondary?: ReactNode;
  contentClassName?: string;
}) {
  useEffect(() => {
    console.error(logLabel, error);
  }, [logLabel, error]);

  return (
    <Card className="shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-destructive">
          {title}
        </CardTitle>
        <IconAlertOctagon className="size-4 text-destructive" />
      </CardHeader>
      <CardContent className={contentClassName}>
        <p className="text-xs text-muted-foreground">{description}</p>
        {error.digest && (
          <p className="font-mono text-[10px] text-muted-foreground">
            Error ID: {error.digest}
          </p>
        )}
        {(retry || actions || secondary) && (
          <div className="flex gap-2">
            {retry && (
              <Button variant="outline" size="sm" onClick={retry}>
                Try again
              </Button>
            )}
            {actions}
            {secondary}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
