/**
 * Server-side data access layer for dashboard queries.
 *
 * These functions run directly in Server Components — no server-action
 * boilerplate (validation, revalidation, action-response wrappers).
 * Every function starts with the workspace auth guard so we never
 * leak data across tenants.
 */

import { db } from "@/lib/prisma";
import type { WorkspaceContext } from "@/lib/access";
import { getContext, projectScope } from "@/lib/queries/context";

// ──────────────────────────────────────────────
// Dashboard Overview Queries
// ──────────────────────────────────────────────

export type DashboardOverviewData = {
  activeProjectCount: number;
  pendingDeliverableCount: number;
  deliverablesInReviewCount: number;
  deliverablesChangesRequestedCount: number;
  openRequestCount: number;
  outstandingInvoiceCount: number;
  outstandingAmount: number;
  overdueInvoiceCount: number;
  overdueAmount: number;
  paidRevenue: number;
  pendingRevenue: number;
  overdueRevenue: number;
};

/**
 * Fetches all dashboard overview stats in a single workspace-scoped pass.
 * Returns `null` when the caller is not authenticated.
 */
export async function getDashboardOverview(): Promise<DashboardOverviewData | null> {
  let ctx: WorkspaceContext;
  try {
    ctx = await getContext();
  } catch {
    return null;
  }
  const scope = await projectScope(ctx);

  const [activeProjectCount, pendingDeliverables, openRequestCount, invoices, paidInvoices] =
    await Promise.all([
      db.project.count({
        where: { ...scope, status: "IN_PROGRESS" },
      }),
      db.deliverable.groupBy({
        by: ["status"],
        where: {
          project: scope,
          status: { in: ["IN_REVIEW", "CHANGES_REQUESTED"] },
        },
        _count: true,
      }),
      db.request.count({
        where: {
          project: scope,
          status: "OPEN",
        },
      }),
      db.invoice.findMany({
        where: {
          project: scope,
          status: { in: ["SENT", "OVERDUE"] },
        },
        select: { amount: true, status: true },
      }),
      db.invoice.findMany({
        where: {
          project: scope,
          status: "PAID",
        },
        select: { amount: true },
      }),
    ]);

  const deliverablesInReviewCount =
    pendingDeliverables.find((d) => d.status === "IN_REVIEW")?._count ?? 0;
  const deliverablesChangesRequestedCount =
    pendingDeliverables.find((d) => d.status === "CHANGES_REQUESTED")?._count ??
    0;
  const pendingDeliverableCount =
    deliverablesInReviewCount + deliverablesChangesRequestedCount;

  const overdueInvoices = invoices.filter((i) => i.status === "OVERDUE");
  const outstandingAmount = invoices.reduce(
    (sum, i) => sum + Number(i.amount),
    0,
  );
  const overdueAmount = overdueInvoices.reduce(
    (sum, i) => sum + Number(i.amount),
    0,
  );
  const paidRevenue = paidInvoices.reduce(
    (sum, i) => sum + Number(i.amount),
    0,
  );
  const pendingRevenue = invoices
    .filter((i) => i.status === "SENT")
    .reduce((sum, i) => sum + Number(i.amount), 0);

  return {
    activeProjectCount,
    pendingDeliverableCount,
    deliverablesInReviewCount,
    deliverablesChangesRequestedCount,
    openRequestCount,
    outstandingInvoiceCount: invoices.length,
    outstandingAmount,
    overdueInvoiceCount: overdueInvoices.length,
    overdueAmount,
    paidRevenue,
    pendingRevenue,
    overdueRevenue: overdueAmount,
  };
}

// ──────────────────────────────────────────────
// Projects List Queries
// ──────────────────────────────────────────────

export type ProjectListItem = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  progress: number;
  startDate: Date | null;
  dueDate: Date | null;
  client: { id: string; name: string; email: string; company: string | null };
  _count: { deliverables: number };
};

export type ProjectListData = {
  projects: ProjectListItem[];
  clients: { id: string; name: string }[];
};

/**
 * Fetches all projects (with client info and deliverable counts) and
 * the workspace's clients (for filter dropdown) in parallel.
 */
export async function getProjectListData(): Promise<ProjectListData> {
  const ctx = await getContext();
  const scope = await projectScope(ctx);

  const [projects, clients] = await Promise.all([
    db.project.findMany({
      where: scope,
      orderBy: { createdAt: "desc" },
      include: {
        client: {
          select: { id: true, name: true, email: true, company: true },
        },
        _count: { select: { deliverables: true } },
      },
    }),
    db.client.findMany({
      where: {
        workspaceId: ctx.workspace.id,
        ...(scope.id ? { projects: { some: { id: scope.id } } } : {}),
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return { projects, clients };
}
