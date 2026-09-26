import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function ClientsPageSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card className="shadow-xs" key={i}>
          <CardHeader className="space-y-0 pb-2">
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-3 w-36" />
            <div className="border-border border-t pt-3">
              <Skeleton className="h-3 w-24" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function PortalPageSkeleton() {
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

export function ProjectsPageSkeleton() {
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

export function ProjectDetailSkeleton() {
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
