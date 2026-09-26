import { Suspense } from "react";
import { db } from "@/lib/prisma";
import { getVisibleProjectIds, requireWorkspacePermission } from "@/lib/access";
import { ClientList } from "@/components/dashboard/client-list";
import { ClientsPageSkeleton } from "@/components/presentational/route-skeletons";

// ──────────────────────────────────────────────
// Server-side data fetch (streams inside Suspense)
// ──────────────────────────────────────────────

async function ClientsData() {
  const guard = await requireWorkspacePermission("MANAGE_CLIENTS");
  if (!guard.ok) return <ClientList clients={[]} />;

  // Need-to-know scoping: members only see clients tied to their
  // assigned projects — mirrors lib/actions/client.ts listClients.
  const visibleIds = await getVisibleProjectIds(
    guard.value.workspace.id,
    guard.value.user.id,
    guard.value.isAdmin,
  );

  const clients = await db.client.findMany({
    where: {
      workspaceId: guard.value.workspace.id,
      ...(visibleIds ? { projects: { some: { id: { in: visibleIds } } } } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { projects: true } },
    },
  });

  // Serialize dates for client component
  return (
    <ClientList
      clients={clients.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        company: c.company,
        createdAt: c.createdAt.toISOString(),
        _count: c._count,
      }))}
    />
  );
}

// ──────────────────────────────────────────────
// Page (Server Component)
// ──────────────────────────────────────────────

export default function ClientsPage() {
  return (
    <div className="max-w-7xl space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="border-b flex flex-col justify-between gap-4 pb-5 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage your workspace clients. Invite them to projects from the
            Portal page.
          </p>
        </div>
      </div>

      {/* Client List */}
      <Suspense fallback={<ClientsPageSkeleton />}>
        <ClientsData />
      </Suspense>
    </div>
  );
}
