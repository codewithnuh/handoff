import { getPortalPageData } from "@/lib/queries/portal";
import { PortalManagement } from "@/components/dashboard/portal-management";
import { PageHeader } from "@/components/dashboard/page-header";

// ──────────────────────────────────────────────
// Page (Server Component)
// ──────────────────────────────────────────────

export default async function PortalPage() {
  const { portalClients, projects } = await getPortalPageData();

  return (
    <div className="workspace-page space-y-6">
      {/* Header */}
      <PageHeader
        title="Client portal"
        description="Control who can see project updates and share each client's workspace link."
      />

      {/* Portal Management */}
      <PortalManagement portalClients={portalClients} projects={projects} />
    </div>
  );
}
