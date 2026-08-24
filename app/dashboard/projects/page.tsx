import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getProjectListData } from "@/lib/queries/project";
import { ProjectList } from "@/components/dashboard/project-list";
import {
  UsageBanner,
  UsageBannerSkeleton,
  ReadOnlyBanner,
} from "@/components/dashboard/usage-banner";
import { getWorkspaceUsage } from "@/lib/queries/project";

// ──────────────────────────────────────────────
// Loading Skeleton
// ──────────────────────────────────────────────

function ProjectsPageSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <Skeleton className="h-8 w-24 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <div className="flex gap-3 items-center">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card className="shadow-xs" key={i}>
            <CardHeader className="space-y-0 pb-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
              <div className="pt-3 border-t border-border space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-32" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Usage Section (server-rendered)
// ──────────────────────────────────────────────

async function ProjectsUsageSection() {
  const usage = await getWorkspaceUsage();

  if (!usage) return null;

  return (
    <>
      <UsageBanner data={usage} />
      {usage.isDowngraded && (
        <ReadOnlyBanner
          gracePeriodEndsAt={usage.gracePeriodEndsAt}
          daysLeft={usage.gracePeriodDaysLeft}
        />
      )}
    </>
  );
}

// ──────────────────────────────────────────────
// Page (Server Component)
// ──────────────────────────────────────────────

export default async function ProjectsPage() {
  const { projects, clients } = await getProjectListData();

  return (
    <div className="space-y-6 max-w-7xl p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your workspace projects, deliverable status, and client
            access.
          </p>
        </div>
      </div>

      {/* Usage banners */}
      <Suspense fallback={<UsageBannerSkeleton />}>
        <ProjectsUsageSection />
      </Suspense>

      {/* Client-rendered list with search & filters */}
      <Suspense fallback={<ProjectsPageSkeleton />}>
        <ProjectList projects={projects} clients={clients} />
      </Suspense>
    </div>
  );
}
