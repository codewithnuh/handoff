import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { db } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/actions/guards";
import { ClientList } from "@/components/dashboard/client-list";

// ──────────────────────────────────────────────
// Server-side data fetch
// ──────────────────────────────────────────────

async function getClientsData() {
  const guard = await requireWorkspace();
  if (!guard.ok) return { clients: [] };

  const clients = await db.client.findMany({
    where: { workspaceId: guard.value.workspace.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { projects: true } },
    },
  });

  // Serialize dates for client component
  return {
    clients: clients.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      company: c.company,
      createdAt: c.createdAt.toISOString(),
      _count: c._count,
    })),
  };
}

// ──────────────────────────────────────────────
// Loading Skeleton
// ──────────────────────────────────────────────

function ClientsPageSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <Skeleton className="h-8 w-20 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <div className="flex gap-3 items-center">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card className="shadow-xs" key={i}>
            <CardHeader className="space-y-0 pb-2">
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-3 w-36" />
              <div className="pt-3 border-t border-border">
                <Skeleton className="h-3 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Page (Server Component)
// ──────────────────────────────────────────────

export default async function ClientsPage() {
  const { clients } = await getClientsData();

  return (
    <div className="space-y-6 max-w-7xl p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your workspace clients. Invite them to projects from the
            Portal page.
          </p>
        </div>
      </div>

      {/* Client List */}
      <Suspense fallback={<ClientsPageSkeleton />}>
        <ClientList clients={clients} />
      </Suspense>
    </div>
  );
}
