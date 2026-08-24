import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getPortalPageData } from "@/lib/queries/project";
import { PortalManagement } from "@/components/dashboard/portal-management";

// ──────────────────────────────────────────────
// Loading Skeleton
// ──────────────────────────────────────────────

function PortalPageSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <Skeleton className="h-8 w-24 mb-2" />
          <Skeleton className="h-4 w-80" />
        </div>
      </div>
      {/* Stats skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card className="shadow-xs" key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="size-8 animate-pulse rounded-full bg-muted" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-8" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {/* List skeleton */}
      <Card className="shadow-xs">
        <CardHeader>
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ──────────────────────────────────────────────
// Page (Server Component)
// ──────────────────────────────────────────────

export default async function PortalPage() {
  const { portalClients, projects } = await getPortalPageData();

  return (
    <div className="space-y-6 max-w-7xl p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Portal</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage client portal access, invite clients to projects, and share
            portal links.
          </p>
        </div>
      </div>

      {/* Portal Management */}
      <Suspense fallback={<PortalPageSkeleton />}>
        <PortalManagement
          portalClients={portalClients}
          projects={projects}
        />
      </Suspense>
    </div>
  );
}
