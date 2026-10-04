import { Clock, DollarSign, Folder, MessageSquare } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { getDashboardOverview } from "@/lib/queries/dashboard";
import { ProjectOverviewError } from "./project-overview-error";

const overviewItems = [
  { id: "active-projects", title: "Active projects", icon: Folder },
  { id: "pending-deliverables", title: "Pending deliverables", icon: Clock },
  { id: "open-client-requests", title: "Open client requests", icon: MessageSquare },
  { id: "outstanding-invoices", title: "Outstanding invoices", icon: DollarSign },
];

export function ProjectOverviewSkeleton() {
  return (
    <div className="dashboard-overview-skeleton" aria-label="Loading workspace summary">
      {overviewItems.map((item) => (
        <div className="overview-skeleton-item" key={item.id}>
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-7 w-16" />
          <Skeleton className="mt-2 h-3 w-32" />
        </div>
      ))}
    </div>
  );
}

export async function ProjectOverview() {
  const data = await getDashboardOverview();

  if (!data) {
    return <ProjectOverviewError message="Please sign in to view your dashboard." />;
  }

  const values: Record<string, { value: string; description: string; note?: string }> = {
    "active-projects": {
      value: String(data.activeProjectCount),
      description: "Projects currently in progress",
    },
    "pending-deliverables": {
      value: String(data.pendingDeliverableCount),
      description: `${data.deliverablesInReviewCount} in review · ${data.deliverablesChangesRequestedCount} changes requested`,
    },
    "open-client-requests": {
      value: String(data.openRequestCount),
      description: "Requests waiting for your reply",
    },
    "outstanding-invoices": {
      value: `$${data.outstandingAmount.toLocaleString()}`,
      description: `${data.overdueInvoiceCount} invoice${data.overdueInvoiceCount !== 1 ? "s" : ""} overdue`,
      note: data.overdueAmount > 0 ? `$${data.overdueAmount.toLocaleString()} overdue` : undefined,
    },
  };

  const revenue = [
    { label: "Paid", value: data.paidRevenue, description: "Confirmed payments" },
    { label: "Pending", value: data.pendingRevenue, description: "Invoices awaiting payment" },
    { label: "Overdue", value: data.overdueRevenue, description: "Past due invoices" },
  ];

  return (
    <section className="dashboard-overview" aria-label="Workspace overview">
      <div className="overview-metrics">
        {overviewItems.map((item) => {
          const Icon = item.icon;
          const metric = values[item.id];

          return (
            <article className="overview-metric" key={item.id}>
              <div className="overview-metric-label"><Icon size={14} /><span>{item.title}</span></div>
              <strong className="overview-metric-value">{metric.value}</strong>
              <p>{metric.description}</p>
              {metric.note && <small>{metric.note}</small>}
            </article>
          );
        })}
      </div>

      <div className="overview-revenue">
        <h2>Revenue</h2>
        <div className="overview-revenue-items">
          {revenue.map((item) => (
            <div className="overview-revenue-item" key={item.label}>
              <span>{item.label}</span>
              <strong>${item.value.toLocaleString()}</strong>
              <small>{item.description}</small>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
