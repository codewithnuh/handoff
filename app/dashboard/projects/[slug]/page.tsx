import { notFound } from "next/navigation";
import { getProjectDetailForViewer } from "@/lib/queries/project-detail";
import { getProjectTasks } from "@/lib/queries/tasks";
import { ProjectDetail } from "@/components/dashboard/project";
import { getWorkspaceUsage } from "@/lib/queries/usage";
import { UsageBanner, ReadOnlyBanner } from "@/components/dashboard/usage-banner";

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

  const [{ data, permissions, currentUserId }, tasks] = await Promise.all([
    Promise.resolve(result),
    getProjectTasks(slug).then((t) => t ?? []),
  ]);

  return (
    <div className="space-y-4">
      {/* Usage banners — only shown if relevant */}
      <DetailUsageSection />

      <ProjectDetail
        data={data}
        permissions={permissions}
        initialTasks={tasks}
        currentUserId={currentUserId}
      />
    </div>
  );
}
