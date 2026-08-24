"use client";

import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Folder, Layers } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WorkspaceUsageData } from "@/lib/queries/project";

// ──────────────────────────────────────────────
// Usage Banner — shows workspace & project limits separately
// ──────────────────────────────────────────────

interface UsageBannerProps {
  data: WorkspaceUsageData;
}

export function UsageBanner({ data }: UsageBannerProps) {
  const { plan, projects, workspaces, isDowngraded } = data;

  const projectRemaining = Math.max(0, projects.max - projects.used);
  const workspaceRemaining = Math.max(0, workspaces.max - workspaces.used);
  const projectCritical = projects.percent >= 100;
  const projectWarning = projects.percent >= 80;
  const workspaceCritical = workspaces.percent >= 100;
  const workspaceWarning = workspaces.percent >= 80;

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Projects Usage Card */}
      <Card
        className={cn(
          "shadow-xs flex-1",
          projectCritical && "border-destructive/50 bg-destructive/5",
          projectWarning && !projectCritical && "border-yellow-500/50 bg-yellow-500/5",
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full",
                  projectCritical
                    ? "bg-destructive/10"
                    : projectWarning
                      ? "bg-yellow-500/10"
                      : "bg-muted",
                )}
              >
                <Folder
                  className={cn(
                    "size-4",
                    projectCritical
                      ? "text-destructive"
                      : projectWarning
                        ? "text-yellow-600 dark:text-yellow-400"
                        : "text-muted-foreground",
                  )}
                />
              </div>
              <div>
                <p className="text-sm font-medium">Projects</p>
                <p className="text-xs text-muted-foreground">
                  {projectCritical ? (
                    <span className="text-destructive font-medium">
                      Limit reached
                    </span>
                  ) : projectWarning ? (
                    <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                      {projectRemaining} remaining
                    </span>
                  ) : (
                    <span>
                      {projectRemaining} of {projects.max} remaining
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span
                className={cn(
                  "text-lg font-bold tabular-nums",
                  projectCritical && "text-destructive",
                  projectWarning && !projectCritical && "text-yellow-600 dark:text-yellow-400",
                )}
              >
                {projects.used}
              </span>
              <span className="text-sm text-muted-foreground">
                /{projects.max}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3 w-full bg-muted rounded-full h-1.5 overflow-hidden">
            <div
              className={cn(
                "h-1.5 rounded-full transition-all duration-500",
                projectCritical
                  ? "bg-destructive"
                  : projectWarning
                    ? "bg-yellow-500 dark:bg-yellow-400"
                    : "bg-primary",
              )}
              style={{ width: `${projects.percent}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Workspaces Usage Card */}
      <Card
        className={cn(
          "shadow-xs flex-1",
          workspaceCritical && "border-destructive/50 bg-destructive/5",
          workspaceWarning && !workspaceCritical && "border-yellow-500/50 bg-yellow-500/5",
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full",
                  workspaceCritical
                    ? "bg-destructive/10"
                    : workspaceWarning
                      ? "bg-yellow-500/10"
                      : "bg-muted",
                )}
              >
                <Layers
                  className={cn(
                    "size-4",
                    workspaceCritical
                      ? "text-destructive"
                      : workspaceWarning
                        ? "text-yellow-600 dark:text-yellow-400"
                        : "text-muted-foreground",
                  )}
                />
              </div>
              <div>
                <p className="text-sm font-medium">Workspaces</p>
                <p className="text-xs text-muted-foreground">
                  {workspaceCritical ? (
                    <span className="text-destructive font-medium">
                      Limit reached
                    </span>
                  ) : workspaceWarning ? (
                    <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                      {workspaceRemaining} remaining
                    </span>
                  ) : (
                    <span>
                      {workspaceRemaining} of {workspaces.max} remaining
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span
                className={cn(
                  "text-lg font-bold tabular-nums",
                  workspaceCritical && "text-destructive",
                  workspaceWarning && !workspaceCritical && "text-yellow-600 dark:text-yellow-400",
                )}
              >
                {workspaces.used}
              </span>
              <span className="text-sm text-muted-foreground">
                /{workspaces.max}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3 w-full bg-muted rounded-full h-1.5 overflow-hidden">
            <div
              className={cn(
                "h-1.5 rounded-full transition-all duration-500",
                workspaceCritical
                  ? "bg-destructive"
                  : workspaceWarning
                    ? "bg-yellow-500 dark:bg-yellow-400"
                    : "bg-primary",
              )}
              style={{ width: `${workspaces.percent}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Upgrade CTA (only when warning or critical) */}
      {(projectWarning || workspaceWarning) && (
        <Card className="shadow-xs flex items-center justify-center sm:w-auto">
          <CardContent className="p-4 flex flex-col items-center gap-2">
            <Badge
              variant={plan === "PRO" ? "default" : "secondary"}
              className="text-[10px]"
            >
              {plan}
            </Badge>
            {isDowngraded && (
              <Badge variant="destructive" className="text-[10px]">
                Downgraded
              </Badge>
            )}
            <Link href="/dashboard/settings">
              <Button
                size="sm"
                variant={projectCritical || workspaceCritical ? "default" : "outline"}
                className="gap-1.5"
              >
                Upgrade
                <ArrowUpRight className="size-3.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Read-Only Banner
// ──────────────────────────────────────────────

interface ReadOnlyBannerProps {
  gracePeriodEndsAt: string | null;
  /** Days remaining in the grace period — computed server-side (Date.now() is impure in client render) */
  daysLeft: number;
}

export function ReadOnlyBanner({ daysLeft }: ReadOnlyBannerProps) {
  return (
    <Card className="shadow-xs border-yellow-500/50 bg-yellow-500/5">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-yellow-500/10">
              <AlertTriangle className="size-4 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-medium">
                Workspace is in read-only mode
              </p>
              <p className="text-xs text-muted-foreground">
                {daysLeft > 0
                  ? `Your subscription has been downgraded. You have ${daysLeft} day${daysLeft !== 1 ? "s" : ""} left in the grace period before read-only mode is fully enforced.`
                  : "Your subscription grace period has expired. Upgrade to restore full access."}
              </p>
            </div>
          </div>
          <Link href="/dashboard/settings">
            <Button size="sm" className="gap-1.5 shrink-0">
              Upgrade to Pro
              <ArrowUpRight className="size-3.5" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────
// Usage Banner Skeleton (for Suspense)
// ──────────────────────────────────────────────

export function UsageBannerSkeleton() {
  return (
    <div className="flex gap-3">
      <Card className="shadow-xs flex-1">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="size-8 shrink-0 animate-pulse rounded-full bg-muted" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-3 w-32 animate-pulse rounded bg-muted" />
            </div>
          </div>
          <div className="mt-3 h-1.5 w-full animate-pulse rounded-full bg-muted" />
        </CardContent>
      </Card>
      <Card className="shadow-xs flex-1">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="size-8 shrink-0 animate-pulse rounded-full bg-muted" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-3 w-32 animate-pulse rounded bg-muted" />
            </div>
          </div>
          <div className="mt-3 h-1.5 w-full animate-pulse rounded-full bg-muted" />
        </CardContent>
      </Card>
    </div>
  );
}
