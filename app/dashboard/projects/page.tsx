import { Suspense } from "react";
import { getProjectListData } from "@/lib/queries/dashboard";
import { ProjectList } from "@/components/dashboard/project-list";
import { ProjectsPageSkeleton } from "@/components/presentational/route-skeletons";
import {
  UsageBanner,
  UsageBannerSkeleton,
  ReadOnlyBanner,
} from "@/components/dashboard/usage-banner";
import { getWorkspaceUsage } from "@/lib/queries/usage";

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
// Projects Section (server-rendered, streams inside Suspense)
// ──────────────────────────────────────────────

async function ProjectsSection() {
  const { projects, clients } = await getProjectListData();
  return <ProjectList projects={projects} clients={clients} />;
}

// ──────────────────────────────────────────────
// Page (Server Component)
// ──────────────────────────────────────────────

export default function ProjectsPage() {
  return (
    <div className="max-w-7xl space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="border-b flex flex-col justify-between gap-4 pb-5 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1 text-sm">
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
        <ProjectsSection />
      </Suspense>
    </div>
  );
}
