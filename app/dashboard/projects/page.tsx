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
import { PageHeader } from "@/components/dashboard/page-header";

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
    <div className="workspace-page space-y-6">
      {/* Header */}
      <PageHeader
        title="Projects"
        description="Track active work, deliverables, deadlines, and client access."
      />

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
