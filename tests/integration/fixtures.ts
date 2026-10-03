import type { PrismaClient } from "@/app/generated/prisma/client";

export const FIXTURE_NOW = new Date("2026-01-15T12:00:00.000Z");

export const fixtureIds = {
  ownerA: "itest_owner_a",
  ownerB: "itest_owner_b",
  admin: "itest_admin",
  member: "itest_member",
  lead: "itest_lead",
  contributor: "itest_contributor",
  observer: "itest_observer",
  workspaceA: "itest_workspace_a",
  workspaceB: "itest_workspace_b",
  clientA: "itest_client_a",
  clientB: "itest_client_b",
  projectA: "itest_project_a",
  projectB: "itest_project_b",
  teamInvite: "itest_team_invite",
  clientInvite: "itest_client_invite",
  deliverable: "itest_deliverable",
  file: "itest_file",
  version: "itest_version",
  request: "itest_request",
  task: "itest_task",
  taskB: "itest_task_b",
  invoice: "itest_invoice",
} as const;

export async function seedIntegrationFixtures(db: PrismaClient) {
  const users = [
    [fixtureIds.ownerA, "owner-a@example.test", "Owner A"],
    [fixtureIds.ownerB, "owner-b@example.test", "Owner B"],
    [fixtureIds.admin, "admin@example.test", "Admin"],
    [fixtureIds.member, "member@example.test", "Member"],
    [fixtureIds.lead, "lead@example.test", "Lead"],
    [fixtureIds.contributor, "contributor@example.test", "Contributor"],
    [fixtureIds.observer, "observer@example.test", "Observer"],
  ] as const;

  for (const [id, email, name] of users) {
    await db.user.upsert({
      where: { id },
      update: {},
      create: { id, email, name, emailVerified: true, createdAt: FIXTURE_NOW, updatedAt: FIXTURE_NOW },
    });
  }

  await db.workspace.upsert({
    where: { id: fixtureIds.workspaceA },
    update: {},
    create: {
      id: fixtureIds.workspaceA,
      name: "Integration Workspace A",
      ownerId: fixtureIds.ownerA,
      createdAt: FIXTURE_NOW,
      updatedAt: FIXTURE_NOW,
    },
  });
  await db.workspace.upsert({
    where: { id: fixtureIds.workspaceB },
    update: {},
    create: {
      id: fixtureIds.workspaceB,
      name: "Integration Workspace B",
      ownerId: fixtureIds.ownerB,
      createdAt: FIXTURE_NOW,
      updatedAt: FIXTURE_NOW,
    },
  });
  await db.user.update({
    where: { id: fixtureIds.ownerA },
    data: { activeWorkspaceId: fixtureIds.workspaceA },
  });
  await db.workspaceMember.createMany({
    data: [
      { id: "itest_workspace_admin", workspaceId: fixtureIds.workspaceA, userId: fixtureIds.admin, role: "ADMIN", createdAt: FIXTURE_NOW },
      { id: "itest_workspace_member", workspaceId: fixtureIds.workspaceA, userId: fixtureIds.member, role: "MEMBER", createdAt: FIXTURE_NOW },
    ],
    skipDuplicates: true,
  });

  await db.client.createMany({
    data: [
      { id: fixtureIds.clientA, workspaceId: fixtureIds.workspaceA, name: "Shared Client A", email: "shared@example.test", createdAt: FIXTURE_NOW, updatedAt: FIXTURE_NOW },
      { id: fixtureIds.clientB, workspaceId: fixtureIds.workspaceB, name: "Shared Client B", email: "shared@example.test", createdAt: FIXTURE_NOW, updatedAt: FIXTURE_NOW },
    ],
    skipDuplicates: true,
  });
  await db.project.createMany({
    data: [
      { id: fixtureIds.projectA, workspaceId: fixtureIds.workspaceA, clientId: fixtureIds.clientA, name: "Integration Project A", createdAt: FIXTURE_NOW, updatedAt: FIXTURE_NOW },
      { id: fixtureIds.projectB, workspaceId: fixtureIds.workspaceB, clientId: fixtureIds.clientB, name: "Integration Project B", createdAt: FIXTURE_NOW, updatedAt: FIXTURE_NOW },
    ],
    skipDuplicates: true,
  });
  await db.projectAccess.upsert({
    where: {
      projectId_email: {
        projectId: fixtureIds.projectA,
        email: "shared@example.test",
      },
    },
    update: {},
    create: {
      id: "itest_project_access_a",
      projectId: fixtureIds.projectA,
      email: "shared@example.test",
      createdAt: FIXTURE_NOW,
    },
  });
  await db.projectMember.createMany({
    data: [
      { id: "itest_project_lead", projectId: fixtureIds.projectA, userId: fixtureIds.lead, role: "LEAD", createdAt: FIXTURE_NOW },
      { id: "itest_project_contributor", projectId: fixtureIds.projectA, userId: fixtureIds.contributor, role: "CONTRIBUTOR", createdAt: FIXTURE_NOW },
      { id: "itest_project_observer", projectId: fixtureIds.projectA, userId: fixtureIds.observer, role: "OBSERVER", createdAt: FIXTURE_NOW },
    ],
    skipDuplicates: true,
  });
  await db.teamInvitation.upsert({
    where: { id: fixtureIds.teamInvite },
    update: {},
    create: {
      id: fixtureIds.teamInvite,
      workspaceId: fixtureIds.workspaceA,
      email: "invitee@example.test",
      token: "itest_team_invite_token",
      expiresAt: new Date(FIXTURE_NOW.getTime() + 86_400_000),
      createdAt: FIXTURE_NOW,
    },
  });
  await db.clientInvitation.upsert({
    where: { id: fixtureIds.clientInvite },
    update: {},
    create: {
      id: fixtureIds.clientInvite,
      projectId: fixtureIds.projectA,
      email: "shared@example.test",
      token: "itest_client_invite_token",
      expiresAt: new Date(FIXTURE_NOW.getTime() + 86_400_000),
      createdAt: FIXTURE_NOW,
    },
  });
  await db.file.upsert({
    where: { id: fixtureIds.file },
    update: {},
    create: {
      id: fixtureIds.file,
      key: "integration/fixture/file.txt",
      filename: "file.txt",
      mimeType: "text/plain",
      size: 12,
      createdAt: FIXTURE_NOW,
    },
  });
  await db.deliverable.upsert({
    where: { id: fixtureIds.deliverable },
    update: {},
    create: {
      id: fixtureIds.deliverable,
      projectId: fixtureIds.projectA,
      title: "Integration deliverable",
      createdAt: FIXTURE_NOW,
      updatedAt: FIXTURE_NOW,
    },
  });
  await db.deliverableVersion.upsert({
    where: { id: fixtureIds.version },
    update: {},
    create: {
      id: fixtureIds.version,
      deliverableId: fixtureIds.deliverable,
      versionNumber: 1,
      fileId: fixtureIds.file,
      createdAt: FIXTURE_NOW,
    },
  });
  await db.request.upsert({
    where: { id: fixtureIds.request },
    update: {},
    create: { id: fixtureIds.request, projectId: fixtureIds.projectA, title: "Integration request", createdAt: FIXTURE_NOW, updatedAt: FIXTURE_NOW },
  });
  await db.task.upsert({
    where: { id: fixtureIds.task },
    update: {},
    create: { id: fixtureIds.task, projectId: fixtureIds.projectA, title: "Integration task", assigneeId: fixtureIds.member, createdAt: FIXTURE_NOW, updatedAt: FIXTURE_NOW },
  });
  await db.task.upsert({
    where: { id: fixtureIds.taskB },
    update: {},
    create: {
      id: fixtureIds.taskB,
      projectId: fixtureIds.projectB,
      title: "Foreign integration task",
      createdAt: FIXTURE_NOW,
      updatedAt: FIXTURE_NOW,
    },
  });
  // The committed initial migration predates the current invoice columns.
  // Keep the invoice fixture compatible with that persisted baseline until
  // the migration-reconciliation issue adds a forward migration.
  await db.$executeRaw`
    INSERT INTO "invoices" ("id", "projectId", "invoiceNumber", "amount", "createdAt", "updatedAt")
    VALUES (${fixtureIds.invoice}, ${fixtureIds.projectA}, 'ITEST-001', 12.00, ${FIXTURE_NOW}, ${FIXTURE_NOW})
    ON CONFLICT ("id") DO NOTHING
  `;

  return { ids: fixtureIds, ownerA: await db.user.findUniqueOrThrow({ where: { id: fixtureIds.ownerA } }) };
}
