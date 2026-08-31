import { Suspense } from "react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { SidebarTrigger } from "@/components/ui/sidebar";

import { getCurrentWorkspace } from "@/lib/actions/workspace";
import { listClients } from "@/lib/actions/client";
import { getSession } from "@/lib/actions/auth";
import { requireWorkspace } from "@/lib/actions/guards";
import {
  ProjectOverview,
  ProjectOverviewSkeleton,
} from "@/components/dashboard/project-overview";
import { DashboardError } from "@/components/dashboard/dashboard-error";
import {
  UsageBanner,
  UsageBannerSkeleton,
  ReadOnlyBanner,
} from "@/components/dashboard/usage-banner";
import {
  getWorkspaceUsage,
  getRecentWorkspaceActivity,
} from "@/lib/queries/project";
import { RecentActivity } from "@/components/dashboard/recent-activity";

// ──────────────────────────────────────────────
// Server-rendered usage section (no Suspense needed — fetched in parallel)
// ──────────────────────────────────────────────

async function UsageSection() {
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
// Server-rendered recent activity (client + freelancer actions)
// ──────────────────────────────────────────────

async function ActivitySection() {
  const activities = await getRecentWorkspaceActivity();

  if (activities.length === 0) return null;

  return <RecentActivity items={activities} />;
}

// ──────────────────────────────────────────────
// Dashboard Page
// ──────────────────────────────────────────────

export default async function Dashboard() {
  const guard = await requireWorkspace();

  const [workspaceResult, sessionResult, clientsResult] = await Promise.all([
    getCurrentWorkspace(),
    getSession(),
    listClients(),
  ]);

  const workspaceName =
    workspaceResult.success && workspaceResult.data
      ? workspaceResult.data.name
      : "Your Workspace";

  const user = sessionResult.success ? sessionResult.data : null;
  const userName =
    user?.user.name ??
    (user?.user.email
      ? user.user.email.split("@")[0].slice(0, 1).toUpperCase() +
        user.user.email.split("@")[0].slice(1)
      : "there");

  const canCreateProject =
    guard.ok &&
    (guard.value.isAdmin ||
      guard.value.permissions.includes("CREATE_PROJECTS"));
  const canManageClients =
    guard.ok &&
    (guard.value.isAdmin ||
      guard.value.permissions.includes("MANAGE_CLIENTS"));

  const clients = clientsResult.success
    ? clientsResult.data.items.map((client) => ({
        id: client.id,
        name: client.name,
        email: client.email,
      }))
    : [];

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      {/* Header — always rendered, no Suspense needed (already fetched above) */}
      <DashboardHeader
        userName={userName}
        workspaceName={workspaceName}
        clients={clients}
        canCreateProject={canCreateProject}
        canManageClients={canManageClients}
      />

      {/* Usage & Read-Only banners — server-rendered, parallel with overview */}
      <Suspense fallback={<UsageBannerSkeleton />}>
        <UsageSection />
      </Suspense>

      {/* Overview Cards — independently suspenseful */}
      <DashboardError>
        <Suspense fallback={<ProjectOverviewSkeleton />}>
          <ProjectOverview />
        </Suspense>
      </DashboardError>

      {/* Recent activity feed — client actions land here via the timeline */}
      <Suspense fallback={null}>
        <ActivitySection />
      </Suspense>
    </div>
  );
}
