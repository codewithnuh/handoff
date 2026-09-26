/**
 * Server-side data access layer for client portal queries.
 *
 * These functions run directly in Server Components — no server-action
 * boilerplate (validation, revalidation, action-response wrappers).
 * Every function starts with the workspace auth guard so we never
 * leak data across tenants.
 */

import { db } from "@/lib/prisma";
import { getWorkspaceId } from "@/lib/queries/context";

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
