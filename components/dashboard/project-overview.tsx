import { Clock, DollarSign, Folder, MessageSquare } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getDashboardOverview } from "@/lib/queries/project";
import { ProjectOverviewError } from "./project-overview-error";

// ──────────────────────────────────────────────
// Loading Skeleton
// ──────────────────────────────────────────────

export function ProjectOverviewSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card className="shadow-md" key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="size-4 rounded-full" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-7 w-16 mb-2" />
            <Skeleton className="h-3 w-36" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────
// Overview Cards (Server Component)
// ──────────────────────────────────────────────

export async function ProjectOverview() {
  const data = await getDashboardOverview();

  if (!data) {
    return (
      <ProjectOverviewError message="Please sign in to view your dashboard." />
    );
  }

  const stats = [
    {
      id: "active-projects",
      title: "Active projects",
      value: data.activeProjectCount,
      description: "Projects currently in progress",
      icon: Folder,
    },
    {
      id: "pending-deliverables",
      title: "Pending deliverables",
      value: data.pendingDeliverableCount,
      description: `${data.deliverablesInReviewCount} in review · ${data.deliverablesChangesRequestedCount} changes requested`,
      icon: Clock,
    },
    {
      id: "open-client-requests",
      title: "Open client requests",
      value: data.openRequestCount,
      description: "Requests waiting for action",
      icon: MessageSquare,
    },
    {
      id: "outstanding-invoices",
      title: "Outstanding invoices",
      value: `$${data.outstandingAmount.toLocaleString()}`,
      description: `${data.overdueInvoiceCount} invoice${data.overdueInvoiceCount !== 1 ? "s" : ""} overdue`,
      subtext:
        data.overdueAmount > 0
          ? `$${data.overdueAmount.toLocaleString()} overdue`
          : undefined,
      icon: DollarSign,
    },
  ];

  const revenueStats = [
    {
      id: "paid-revenue",
      title: "Paid revenue",
      value: `$${data.paidRevenue.toLocaleString()}`,
      description: "Total confirmed payments",
      icon: DollarSign,
      color: "text-green-600",
    },
    {
      id: "pending-revenue",
      title: "Pending revenue",
      value: `$${data.pendingRevenue.toLocaleString()}`,
      description: "Sent invoices awaiting payment",
      icon: Clock,
      color: "text-blue-600",
    },
    {
      id: "overdue-revenue",
      title: "Overdue revenue",
      value: `$${data.overdueRevenue.toLocaleString()}`,
      description: "Past due invoices",
      icon: DollarSign,
      color: "text-red-600",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <Card className="shadow-md" key={stat.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>

                <Icon className="size-4 text-muted-foreground" />
              </CardHeader>

              <CardContent>
                <div className="text-2xl font-bold tracking-tight">
                  {stat.value}
                </div>

                <p className="mt-1 text-xs text-muted-foreground">
                  {stat.description}
                </p>

                {stat.subtext && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {stat.subtext}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Revenue Overview */}
      <div className="grid gap-4 sm:grid-cols-3">
        {revenueStats.map((stat) => {
          const Icon = stat.icon;

          return (
            <Card className="shadow-md" key={stat.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>

                <Icon className={`size-4 ${stat.color}`} />
              </CardHeader>

              <CardContent>
                <div className="text-2xl font-bold tracking-tight">
                  {stat.value}
                </div>

                <p className="mt-1 text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
