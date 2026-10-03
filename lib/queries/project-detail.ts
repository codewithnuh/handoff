/**
 * Server-side data access layer for single project detail queries.
 *
 * These functions run directly in Server Components — no server-action
 * boilerplate (validation, revalidation, action-response wrappers).
 * Every function starts with the workspace auth guard so we never
 * leak data across tenants.
 */

import { db } from "@/lib/prisma";
import {
  requirePortalProjectAccess,
  resolveProjectAccess,
} from "@/lib/access";
import type { EffectiveRole } from "@/lib/access";
import { lineItemMoneyStrings, moneyStrings } from "@/lib/invoice/money";

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
    discount: string;
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
  userProfile: {
    name: string;
    email: string;
  };
};

export type ViewerPermissions = {
  role: EffectiveRole;
  isWorkspaceOwner: boolean;
  canEditProject: boolean;
  canDeleteProject: boolean;
  canManageDeliverables: boolean;
  canSubmitForReview: boolean;
  canUpdateRequests: boolean;
  isObserver: boolean;
};

/** Which of the two detail surfaces is asking — the only thing that varies. */
type DetailScope = { portal: boolean; workspaceId?: string };

/**
 * One query body for both surfaces. Scope decides the WHERE clauses
 * (workspace tenant, DRAFT deliverables, invoice statuses, approved list);
 * the adapters decide what each payload keeps.
 */
async function loadProjectDetail(projectId: string, scope: DetailScope) {
  const project = await db.project.findFirst({
    where: {
      id: projectId,
      ...(scope.portal ? {} : { workspaceId: scope.workspaceId }),
    },
    include: {
      client: {
        select: { id: true, name: true, email: true, company: true },
      },
    },
  });

  if (!project) return null;

  const [deliverables, requests, invoices, activities] = await Promise.all([
    db.deliverable.findMany({
      where: {
        projectId,
        // DRAFT deliverables are freelancer-internal until submitted
        ...(scope.portal ? { status: { not: "DRAFT" } } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        versions: {
          orderBy: { versionNumber: "desc" },
          include: {
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
        ...(scope.portal ? { status: { in: ["SENT", "PAID", "OVERDUE"] } } : {}),
      },
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
  const approvedDeliverables = scope.portal
    ? []
    : await db.deliverable.findMany({
        where: {
          projectId,
          status: "APPROVED",
          lineItems: { none: {} },
        },
        select: { id: true, title: true, description: true },
      });

  return {
    project,
    deliverables,
    requests,
    invoices: invoices.map((inv) => ({
      ...moneyStrings(inv),
      lineItems: inv.lineItems.map((lineItem) => ({
        ...lineItemMoneyStrings(lineItem),
        quantity: Number(lineItem.quantity),
      })),
    })),
    activities,
    approvedDeliverables,
  };
}

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

  const detail = await loadProjectDetail(projectId, {
    portal: false,
    workspaceId: access.value.workspaceId,
  });
  if (!detail) return null;

  return {
    data: {
      project: detail.project,
      deliverables: detail.deliverables,
      requests: detail.requests,
      invoices: detail.invoices,
      approvedDeliverables: detail.approvedDeliverables,
      activities: detail.activities,
      userProfile: {
        name: access.value.user.name,
        email: access.value.user.email,
      },
    },
    permissions: {
      role: access.value.role,
      isWorkspaceOwner: access.value.isWorkspaceOwner,
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
    discount: string;
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
  const access = await requirePortalProjectAccess(email, projectId);
  if (!access.ok) return null;

  const detail = await loadProjectDetail(projectId, { portal: true });
  if (!detail) return null;

  // Security boundary: the shared query fetches the viewer's wider shape
  // (version notes, file keys, client email, draft-safe extras), so the
  // portal payload is built by picking fields explicitly — never spread.
  return {
    project: {
      id: detail.project.id,
      name: detail.project.name,
      description: detail.project.description,
      status: detail.project.status,
      progress: detail.project.progress,
      startDate: detail.project.startDate,
      dueDate: detail.project.dueDate,
      createdAt: detail.project.createdAt,
      client: detail.project.client
        ? {
            name: detail.project.client.name,
            company: detail.project.client.company,
          }
        : null,
    },
    deliverables: detail.deliverables.map((deliverable) => ({
      id: deliverable.id,
      title: deliverable.title,
      description: deliverable.description,
      status: deliverable.status,
      version: deliverable.version,
      createdAt: deliverable.createdAt,
      updatedAt: deliverable.updatedAt,
      versions: deliverable.versions.map((version) => ({
        id: version.id,
        versionNumber: version.versionNumber,
        createdAt: version.createdAt,
        file: version.file
          ? {
              id: version.file.id,
              filename: version.file.filename,
              mimeType: version.file.mimeType,
              size: version.file.size,
            }
          : null,
      })),
      comments: deliverable.comments,
    })),
    requests: detail.requests,
    invoices: detail.invoices.map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      description: invoice.description,
      subtotal: invoice.subtotal,
      discount: invoice.discount,
      taxRate: invoice.taxRate,
      taxAmount: invoice.taxAmount,
      amount: invoice.amount,
      currency: invoice.currency,
      dueDate: invoice.dueDate,
      paidAt: invoice.paidAt,
      paymentNotes: invoice.paymentNotes,
      status: invoice.status,
      createdAt: invoice.createdAt,
      lineItems: invoice.lineItems.map((lineItem) => ({
        description: lineItem.description,
        quantity: Number(lineItem.quantity),
        unitPrice: lineItem.unitPrice,
        amount: lineItem.amount,
      })),
    })),
    activities: detail.activities,
  };
}
