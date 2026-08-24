/**
 * Server-side data access layer for project-related queries.
 *
 * These functions run directly in Server Components — no server-action
 * boilerplate (validation, revalidation, action-response wrappers).
 * Every function starts with the workspace auth guard so we never
 * leak data across tenants.
 */

import { db } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/actions/guards";
import { getEffectivePlan } from "@/lib/services/plan-limits";
import type { PlanKey } from "@/lib/constants/plans";

// ──────────────────────────────────────────────
// Helper: extract workspaceId or throw
// ──────────────────────────────────────────────

async function getWorkspaceId(): Promise<string> {
  const guard = await requireWorkspace();
  if (!guard.ok) throw guard.error;
  return guard.value.workspace.id;
}

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
};

// ──────────────────────────────────────────────
// Workspace Usage (for dashboard banners)
// ──────────────────────────────────────────────

export type WorkspaceUsageData = {
  plan: PlanKey;
  isDowngraded: boolean;
  /** ISO string — Date objects are not serializable across RSC → client boundary */
  gracePeriodEndsAt: string | null;
  /** Whole days left in the downgrade grace period (0 when expired/absent) */
  gracePeriodDaysLeft: number;
  projects: { used: number; max: number; percent: number };
  workspaces: { used: number; max: number; percent: number };
};

/**
 * Returns current workspace usage stats against plan limits.
 * Used by the dashboard to show usage banners and upgrade CTAs.
 */
export async function getWorkspaceUsage(): Promise<WorkspaceUsageData | null> {
  const guard = await requireWorkspace();
  if (!guard.ok) return null;
  const workspaceId = guard.value.workspace.id;
  const userId = guard.value.user.id;

  const [effective, projectCount, workspaceCount] = await Promise.all([
    getEffectivePlan(workspaceId),
    db.project.count({ where: { workspaceId } }),
    db.workspace.count({ where: { ownerId: userId } }),
  ]);

  const maxProjects = effective.limits.maxProjectsPerWorkspace;
  const maxWorkspaces = effective.limits.maxWorkspaces;

  return {
    plan: effective.plan,
    isDowngraded: effective.isDowngraded,
    gracePeriodEndsAt: effective.gracePeriodEndsAt?.toISOString() ?? null,
    gracePeriodDaysLeft: effective.gracePeriodEndsAt
      ? Math.max(
          0,
          Math.ceil(
            (effective.gracePeriodEndsAt.getTime() - Date.now()) /
              (1000 * 60 * 60 * 24),
          ),
        )
      : 0,
    projects: {
      used: projectCount,
      max: maxProjects,
      percent: Math.min(Math.round((projectCount / maxProjects) * 100), 100),
    },
    workspaces: {
      used: workspaceCount,
      max: maxWorkspaces,
      percent: Math.min(Math.round((workspaceCount / maxWorkspaces) * 100), 100),
    },
  };
}

/**
 * Fetches all dashboard overview stats in a single workspace-scoped pass.
 * Returns `null` when the caller is not authenticated.
 */
export async function getDashboardOverview(): Promise<DashboardOverviewData | null> {
  let workspaceId: string;
  try {
    workspaceId = await getWorkspaceId();
  } catch {
    return null;
  }

  const [
    activeProjectCount,
    pendingDeliverables,
    openRequestCount,
    invoices,
  ] = await Promise.all([
    db.project.count({
      where: { workspaceId, status: "IN_PROGRESS" },
    }),
    db.deliverable.groupBy({
      by: ["status"],
      where: {
        project: { workspaceId },
        status: { in: ["IN_REVIEW", "CHANGES_REQUESTED"] },
      },
      _count: true,
    }),
    db.request.count({
      where: {
        project: { workspaceId },
        status: "OPEN",
      },
    }),
    db.invoice.findMany({
      where: {
        project: { workspaceId },
        status: { in: ["SENT", "OVERDUE"] },
      },
      select: { amount: true, status: true },
    }),
  ]);

  const deliverablesInReviewCount =
    pendingDeliverables.find((d) => d.status === "IN_REVIEW")?._count ?? 0;
  const deliverablesChangesRequestedCount =
    pendingDeliverables.find((d) => d.status === "CHANGES_REQUESTED")?._count ?? 0;
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
  const workspaceId = await getWorkspaceId();

  const [projects, clients] = await Promise.all([
    db.project.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      include: {
        client: {
          select: { id: true, name: true, email: true, company: true },
        },
        _count: { select: { deliverables: true } },
      },
    }),
    db.client.findMany({
      where: { workspaceId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return { projects, clients };
}

// ──────────────────────────────────────────────
// Single Project Detail Queries
// ──────────────────────────────────────────────

export type ProjectDetailData = {
  project: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    progress: number;
    startDate: Date | null;
    dueDate: Date | null;
    createdAt: Date;
    client: { id: string; name: string; email: string; company: string | null };
  };
  deliverables: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    /** Optimistic-locking version — must be sent with mutations */
    version: number;
    createdAt: Date;
    updatedAt: Date;
    versions: {
      id: string;
      versionNumber: number;
      fileId: string | null;
      notes: string | null;
      createdAt: Date;
      file: { id: string; key: string; filename: string; mimeType: string | null; size: number | null } | null;
    }[];
  }[];
  requests: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }[];
  invoices: {
    id: string;
    invoiceNumber: string;
    description: string | null;
    amount: string;
    currency: string;
    dueDate: Date | null;
    status: string;
    createdAt: Date;
  }[];
  activities: {
    id: string;
    type: string;
    actorName: string | null;
    actorEmail: string | null;
    meta: unknown;
    createdAt: Date;
  }[];
};

/**
 * Fetches all data for the single-project detail page in parallel.
 * Returns `null` when the project is not found or the user has no access.
 */
export async function getProjectDetail(
  projectId: string,
): Promise<ProjectDetailData | null> {
  const workspaceId = await getWorkspaceId();

  const project = await db.project.findFirst({
    where: { id: projectId, workspaceId },
    include: {
      client: {
        select: { id: true, name: true, email: true, company: true },
      },
    },
  });

  if (!project) return null;

  const [deliverables, requests, invoices, activities] = await Promise.all([
    db.deliverable.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      include: {
        versions: {
          orderBy: { versionNumber: "desc" },
          include: {
            file: {
              select: {
                id: true,
                key: true,
                filename: true,
                mimeType: true,
                size: true,
              },
            },
          },
        },
      },
    }),
    db.request.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    }),
    db.invoice.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    }),
    db.activity.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return {
    project,
    deliverables,
    requests,
    invoices: invoices.map((inv) => ({
      ...inv,
      amount: String(inv.amount),
    })),
    activities,
  };
}

// ──────────────────────────────────────────────
// Portal Client Access Queries
// ──────────────────────────────────────────────

export type PortalClientData = {
  email: string;
  name: string | null;
  hasAccess: boolean;
  acceptedAt: string | null;
  lastInvitedAt: string;
  projects: { id: string; name: string }[];
};

/**
 * Returns all clients in the workspace with their portal access status.
 * Used by the dashboard to show who has accepted invitations.
 */
export async function getPortalClients(): Promise<PortalClientData[]> {
  const workspaceId = await getWorkspaceId();

  // Get all clients in the workspace
  const clients = await db.client.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true },
  });

  if (clients.length === 0) return [];

  const clientEmails = clients.map((c) => c.email);

  // Get all project access records for these emails
  const accessRecords = await db.projectAccess.findMany({
    where: {
      email: { in: clientEmails },
      project: { workspaceId },
    },
    select: {
      email: true,
      projectId: true,
      createdAt: true,
      project: { select: { id: true, name: true } },
    },
  });

  // Get latest invitations for each email
  const invitations = await db.clientInvitation.findMany({
    where: {
      email: { in: clientEmails },
      project: { workspaceId },
    },
    orderBy: { createdAt: "desc" },
    select: {
      email: true,
      acceptedAt: true,
      createdAt: true,
    },
  });

  // Build the result — one entry per client.
  // hasAccess reflects *current* ProjectAccess rows only: accepted
  // invitations alone don't grant access (revocation must be reflected).
  return clients.map((client) => {
    const clientAccess = accessRecords.filter((a) => a.email === client.email);
    const clientInvites = invitations.filter((i) => i.email === client.email);
    const latestAcceptedInvite = clientInvites.find(
      (i) => i.acceptedAt !== null,
    );
    const latestInvite = clientInvites[0];

    return {
      email: client.email,
      name: client.name,
      hasAccess: clientAccess.length > 0,
      acceptedAt:
        latestAcceptedInvite?.acceptedAt?.toISOString() ??
        latestInvite?.acceptedAt?.toISOString() ??
        null,
      lastInvitedAt: (latestInvite?.createdAt ?? new Date()).toISOString(),
      projects: clientAccess.map((a) => a.project),
    };
  });
}

// ──────────────────────────────────────────────
// Portal Page Data (clients + projects combined)
// ──────────────────────────────────────────────

export type PortalPageData = {
  portalClients: PortalClientData[];
  projects: { id: string; name: string; client: { name: string; email: string } | null }[];
};

/**
 * Fetches portal clients and workspace projects in parallel.
 * Used by the /dashboard/portal page.
 */
export async function getPortalPageData(): Promise<PortalPageData> {
  const workspaceId = await getWorkspaceId();

  const [portalClients, projects] = await Promise.all([
    getPortalClients(),
    db.project.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        client: { select: { name: true, email: true } },
      },
    }),
  ]);

  return { portalClients, projects };
}

// ──────────────────────────────────────────────
// Portal Home — all projects a client has access to
// ──────────────────────────────────────────────

export type PortalHomeProject = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  progress: number;
  dueDate: Date | null;
  createdAt: Date;
  client: { name: string; company: string | null } | null;
  _count: { deliverables: number; requests: number };
};

/**
 * Returns all projects a client has portal access to.
 * Client is identified by email (from their session).
 */
export async function getPortalHomeProjects(
  email: string,
): Promise<PortalHomeProject[]> {
  const access = await db.projectAccess.findMany({
    where: { email },
    select: { projectId: true },
  });

  if (access.length === 0) return [];

  const projectIds = access.map((a) => a.projectId);

  return db.project.findMany({
    where: { id: { in: projectIds } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      progress: true,
      dueDate: true,
      createdAt: true,
      client: { select: { name: true, company: true } },
      _count: { select: { deliverables: true, requests: true } },
    },
  });
}

// ──────────────────────────────────────────────
// Portal Project Detail — full data scoped to client
// ──────────────────────────────────────────────

export type PortalProjectDetail = {
  project: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    progress: number;
    startDate: Date | null;
    dueDate: Date | null;
    createdAt: Date;
    client: { name: string; company: string | null } | null;
  };
  deliverables: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    version: number; // optimistic locking version
    createdAt: Date;
    updatedAt: Date;
    versions: {
      id: string;
      versionNumber: number;
      createdAt: Date;
      file: {
        id: string;
        filename: string;
        mimeType: string | null;
        size: number | null;
      } | null;
    }[];
    comments: {
      id: string;
      content: string;
      authorUserId: string | null;
      authorEmail: string | null;
      authorName: string | null;
      createdAt: Date;
    }[];
  }[];
  requests: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    comments: {
      id: string;
      content: string;
      authorUserId: string | null;
      authorEmail: string | null;
      authorName: string | null;
      createdAt: Date;
    }[];
  }[];
  activities: {
    id: string;
    type: string;
    actorName: string | null;
    meta: unknown;
    createdAt: Date;
  }[];
};

/**
 * Returns full project detail for the portal.
 * Client must have ProjectAccess for this project.
 */
export async function getPortalProjectDetail(
  projectId: string,
  email: string,
): Promise<PortalProjectDetail | null> {
  // Verify access
  const access = await db.projectAccess.findUnique({
    where: { projectId_email: { projectId, email } },
    select: { id: true },
  });

  if (!access) return null;

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      progress: true,
      startDate: true,
      dueDate: true,
      createdAt: true,
      client: { select: { name: true, company: true } },
    },
  });

  if (!project) return null;

  const [deliverables, requests, activities] = await Promise.all([
    db.deliverable.findMany({
      where: {
        projectId,
        // DRAFT deliverables are freelancer-internal until submitted
        status: { not: "DRAFT" },
      },
      orderBy: { createdAt: "desc" },
      include: {
        versions: {
          orderBy: { versionNumber: "desc" },
          // Explicit select — version notes are freelancer-internal and
          // must never leak into the client portal payload
          select: {
            id: true,
            versionNumber: true,
            createdAt: true,
            file: {
              select: {
                id: true,
                filename: true,
                mimeType: true,
                size: true,
              },
            },
          },
        },
        comments: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            content: true,
            authorUserId: true,
            authorEmail: true,
            authorName: true,
            createdAt: true,
          },
        },
      },
    }),
    db.request.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      include: {
        comments: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            content: true,
            authorUserId: true,
            authorEmail: true,
            authorName: true,
            createdAt: true,
          },
        },
      },
    }),
    db.activity.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return { project, deliverables, requests, activities };
}

// ──────────────────────────────────────────────
// Dashboard Recent Activity — workspace-wide feed
// ──────────────────────────────────────────────

export type RecentActivityItem = {
  id: string;
  type: string;
  actorName: string | null;
  actorEmail: string | null;
  /** Client actions have actorEmail but no actorUserId */
  isClientAction: boolean;
  projectName: string;
  projectId: string;
  createdAt: Date;
};

/**
 * Returns the latest activities across all projects in the workspace,
 * including client actions (approvals, change requests, comments).
 * Used by the dashboard home so freelancer-side work and client
 * activity both surface in one feed.
 */
export async function getRecentWorkspaceActivity(
  take = 15,
): Promise<RecentActivityItem[]> {
  const workspaceId = await getWorkspaceId();

  const activities = await db.activity.findMany({
    where: { project: { workspaceId } },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      type: true,
      actorName: true,
      actorEmail: true,
      actorUserId: true,
      createdAt: true,
      project: { select: { id: true, name: true } },
    },
  });

  return activities.map((a) => ({
    id: a.id,
    type: a.type,
    actorName: a.actorName,
    actorEmail: a.actorEmail,
    isClientAction: !a.actorUserId,
    projectName: a.project.name,
    projectId: a.project.id,
    createdAt: a.createdAt,
  }));
}
