/**
 * Server-side data access layer for project-related queries.
 *
 * These functions run directly in Server Components — no server-action
 * boilerplate (validation, revalidation, action-response wrappers).
 * Every function starts with the workspace auth guard so we never
 * leak data across tenants.
 */

import { db } from "@/lib/prisma";
import {
  getVisibleProjectIds,
  requireWorkspace,
  resolveProjectAccess,
} from "@/lib/actions/guards";
import type { EffectiveRole } from "@/lib/actions/guards";
import type { WorkspaceContext } from "@/lib/actions/guards";
import { getEffectivePlan } from "@/lib/services/plan-limits";
import type { PlanKey } from "@/lib/constants/plans";

// ──────────────────────────────────────────────
// Helpers: auth context + need-to-know scoping
// ──────────────────────────────────────────────

async function getContext(): Promise<WorkspaceContext> {
  const guard = await requireWorkspace();
  if (!guard.ok) throw guard.error;
  return guard.value;
}

/** Prisma `project` filter limiting results to the caller's visible projects. */
async function projectScope(
  ctx: WorkspaceContext,
): Promise<{ workspaceId: string; id?: { in: string[] } }> {
  const visibleIds = await getVisibleProjectIds(
    ctx.workspace.id,
    ctx.user.id,
    ctx.isAdmin,
  );
  return {
    workspaceId: ctx.workspace.id,
    ...(visibleIds ? { id: { in: visibleIds } } : {}),
  };
}

async function getWorkspaceId(): Promise<string> {
  return (await getContext()).workspace.id;
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
  paidRevenue: number;
  pendingRevenue: number;
  overdueRevenue: number;
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
    getEffectivePlan(userId),
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
      percent: Math.min(
        Math.round((workspaceCount / maxWorkspaces) * 100),
        100,
      ),
    },
  };
}

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
      file: {
        id: string;
        key: string;
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
  invoices: {
    id: string;
    invoiceNumber: string;
    description: string | null;
    subtotal: string;
    taxRate: string;
    taxAmount: string;
    amount: string;
    currency: string;
    dueDate: Date | null;
    paidAt: Date | null;
    paymentNotes: string | null;
    status: string;
    createdAt: Date;
    lineItems: {
      id: string;
      description: string;
      quantity: number;
      unitPrice: string;
      amount: string;
      deliverableId: string | null;
    }[];
  }[];
  approvedDeliverables: {
    id: string;
    title: string;
    description: string | null;
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

export type ViewerPermissions = {
  role: EffectiveRole;
  canEditProject: boolean;
  canDeleteProject: boolean;
  canManageDeliverables: boolean;
  canSubmitForReview: boolean;
  canUpdateRequests: boolean;
  isObserver: boolean;
};

/**
 * Fetches all data for the single-project detail page in parallel,
 * plus the caller's effective permissions so the UI can gate mutations.
 * Returns `null` when the project is not found or the user has no access.
 */
export async function getProjectDetailForViewer(
  projectId: string,
): Promise<{ data: ProjectDetailData; permissions: ViewerPermissions; currentUserId: string } | null> {
  const access = await resolveProjectAccess(projectId).catch(() => null);
  if (!access || !access.ok) return null;

  const project = await db.project.findFirst({
    where: { id: projectId, workspaceId: access.value.workspaceId },
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
    db.invoice.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      include: {
        lineItems: {
          select: {
            id: true,
            description: true,
            quantity: true,
            unitPrice: true,
            amount: true,
            deliverableId: true,
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

  // Get approved deliverables not yet linked to any invoice line item
  const approvedDeliverables = await db.deliverable.findMany({
    where: {
      projectId,
      status: "APPROVED",
      lineItems: { none: {} },
    },
    select: { id: true, title: true, description: true },
  });

  return {
    data: {
      project,
      deliverables,
      requests,
      invoices: invoices.map((inv) => ({
        ...inv,
        subtotal: String(inv.subtotal),
        taxRate: String(inv.taxRate),
        taxAmount: String(inv.taxAmount),
        amount: String(inv.amount),
        lineItems: inv.lineItems.map((li) => ({
          ...li,
          unitPrice: String(li.unitPrice),
          amount: String(li.amount),
        })),
      })),
      approvedDeliverables,
      activities,
    },
    permissions: {
      role: access.value.role,
      canEditProject: access.value.canEditProject,
      canDeleteProject: access.value.canDeleteProject,
      canManageDeliverables: access.value.canManageDeliverables,
      canSubmitForReview: access.value.canSubmitForReview,
      canUpdateRequests: access.value.canUpdateRequests,
      isObserver: access.value.isObserver,
    },
    currentUserId: access.value.user.id,
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
  projects: {
    id: string;
    name: string;
    client: { name: string; email: string } | null;
  }[];
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
  invoices: {
    id: string;
    invoiceNumber: string;
    description: string | null;
    subtotal: string;
    taxRate: string;
    taxAmount: string;
    amount: string;
    currency: string;
    dueDate: Date | null;
    paidAt: Date | null;
    paymentNotes: string | null;
    status: string;
    createdAt: Date;
    lineItems: {
      description: string;
      quantity: number;
      unitPrice: string;
      amount: string;
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

  const [deliverables, requests, invoices, activities] = await Promise.all([
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
    db.invoice.findMany({
      where: {
        projectId,
        status: { in: ["SENT", "PAID", "OVERDUE"] },
      },
      orderBy: { createdAt: "desc" },
      include: {
        lineItems: {
          select: {
            description: true,
            quantity: true,
            unitPrice: true,
            amount: true,
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

  return {
    project,
    deliverables,
    requests,
    invoices: invoices.map((inv) => ({
      ...inv,
      subtotal: String(inv.subtotal),
      taxRate: String(inv.taxRate),
      taxAmount: String(inv.taxAmount),
      amount: String(inv.amount),
      lineItems: inv.lineItems.map((li) => ({
        ...li,
        unitPrice: String(li.unitPrice),
        amount: String(li.amount),
      })),
    })),
    activities,
  };
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
  const ctx = await getContext();
  const scope = await projectScope(ctx);

  const activities = await db.activity.findMany({
    where: { project: scope },
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

// ──────────────────────────────────────────────
// Team Page Data
// ──────────────────────────────────────────────

export type TeamAssignmentProject = {
  id: string;
  name: string;
};

/**
 * Projects whose assignments the caller may manage on the team page:
 * everything for owner/admin, only led projects for regular members.
 */
export async function getManageableProjects(): Promise<{
  projects: TeamAssignmentProject[];
}> {
  const ctx = await getContext();

  if (ctx.isAdmin) {
    const projects = await db.project.findMany({
      where: { workspaceId: ctx.workspace.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true },
    });
    return { projects };
  }

  // Leads manage the projects they lead
  const memberships = await db.projectMember.findMany({
    where: {
      userId: ctx.user.id,
      role: "LEAD",
      project: { workspaceId: ctx.workspace.id },
    },
    orderBy: { createdAt: "desc" },
    select: { project: { select: { id: true, name: true } } },
  });
  return {
    projects: memberships.map((m) => ({
      id: m.project.id,
      name: m.project.name,
    })),
  };
}
