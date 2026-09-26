import { getPortalPageData } from "@/lib/queries/portal";
import { PortalManagement } from "@/components/dashboard/portal-management";

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
      <PortalManagement portalClients={portalClients} projects={projects} />
    </div>
  );
}
