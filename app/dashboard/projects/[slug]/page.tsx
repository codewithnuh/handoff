import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getProjectDetailForViewer } from "@/lib/queries/project";
import { getProjectTasks } from "@/lib/queries/tasks";
import { ProjectDetail } from "@/components/dashboard/project";
import { getWorkspaceUsage } from "@/lib/queries/project";
import {
  UsageBanner,
  UsageBannerSkeleton,
  ReadOnlyBanner,
} from "@/components/dashboard/usage-banner";

// ──────────────────────────────────────────────
// Loading Skeleton
// ──────────────────────────────────────────────

function ProjectDetailSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-8xl mx-auto">
      {/* Breadcrumb */}
      <Skeleton className="h-3 w-32" />

      {/* Header Card */}
      <Card className="shadow-xs">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-9 w-36" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="space-y-4">
        <Skeleton className="h-10 w-80" />
        <Card className="shadow-xs">
          <CardContent className="p-6 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Usage Section (server-rendered)
// ──────────────────────────────────────────────

async function DetailUsageSection() {
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

export default async function SingleProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Validate slug format (edge case: weird characters in URL)
  if (!slug || slug.length > 200) {
    notFound();
  }

  const result = await getProjectDetailForViewer(slug);

  if (!result) {
    notFound();
  }

  const [{ data, permissions }, tasks] = await Promise.all([
    Promise.resolve(result),
    getProjectTasks(slug).then((t) => t ?? []),
  ]);

  return (
    <div className="space-y-4">
      {/* Usage banners — only shown if relevant */}
      <Suspense fallback={<UsageBannerSkeleton />}>
        <DetailUsageSection />
      </Suspense>

      <Suspense fallback={<ProjectDetailSkeleton />}>
        <ProjectDetail
          data={data}
          permissions={permissions}
          initialTasks={tasks}
        />
      </Suspense>
    </div>
  );
}
