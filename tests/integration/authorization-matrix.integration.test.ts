import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { db } from "@/lib/prisma";
import { getProject } from "@/lib/actions/project";
import { createProject } from "@/lib/actions/project";
import { updateTask } from "@/lib/actions/task";
import {
  removeTeamMember,
  updateMemberPermissions,
  updateTeamMemberRole,
} from "@/lib/actions/team";
import { switchWorkspace } from "@/lib/actions/workspace";
import { setSubjectAdapters } from "@/lib/access";
import { getPortalHomeProjects } from "@/lib/queries/portal";
import { GET as downloadFile } from "@/app/api/files/[id]/download/route";
import { fixtureIds, seedIntegrationFixtures } from "./fixtures";

// Server entry points import server-only modules by design. The integration
// runner exercises them in Node, where Next's client-boundary marker is not
// meaningful.
vi.mock("server-only", () => ({}));

let restoreSubject: (() => void) | undefined;

async function actAsUser(userId: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  restoreSubject?.();
  restoreSubject = setSubjectAdapters({
    getUser: async () => user,
    getClient: async () => null,
  });
}

beforeAll(async () => {
  await seedIntegrationFixtures(db);
  await db.workspaceMember.createMany({
    data: [
      { id: "itest_workspace_lead", workspaceId: fixtureIds.workspaceA, userId: fixtureIds.lead, role: "MEMBER" },
      { id: "itest_workspace_contributor", workspaceId: fixtureIds.workspaceA, userId: fixtureIds.contributor, role: "MEMBER" },
      { id: "itest_workspace_observer", workspaceId: fixtureIds.workspaceA, userId: fixtureIds.observer, role: "MEMBER" },
    ],
    skipDuplicates: true,
  });
  await db.user.updateMany({
    where: { id: { in: [fixtureIds.admin, fixtureIds.member, fixtureIds.lead, fixtureIds.contributor, fixtureIds.observer] } },
    data: { activeWorkspaceId: fixtureIds.workspaceA },
  });
});

afterAll(() => restoreSubject?.());

describe("authorization matrix against PostgreSQL", () => {
  it("rejects cross-workspace project reads and project creation with a foreign client", async () => {
    await actAsUser(fixtureIds.ownerA);

    const project = await getProject({ id: fixtureIds.projectB });
    expect(project.success).toBe(false);

    const before = await db.project.count({ where: { workspaceId: fixtureIds.workspaceA } });
    const created = await createProject({ clientId: fixtureIds.clientB, name: "Foreign client project" });
    expect(created.success).toBe(false);
    expect(await db.project.count({ where: { workspaceId: fixtureIds.workspaceA } })).toBe(before);
  });

  it("rechecks authorization inside guard:null actions before writing", async () => {
    await actAsUser(fixtureIds.ownerA);

    const result = await updateTask({ id: fixtureIds.taskB, title: "Unauthorized change" });
    expect(result.success).toBe(false);
    const task = await db.task.findUniqueOrThrow({ where: { id: fixtureIds.taskB } });
    expect(task.title).toBe("Foreign integration task");
  });

  it("keeps workspace owners immutable through role and removal actions", async () => {
    await actAsUser(fixtureIds.ownerA);

    expect((await updateTeamMemberRole({ userId: fixtureIds.ownerA, role: "MEMBER" })).success).toBe(false);
    expect((await updateMemberPermissions({ userId: fixtureIds.ownerA, permissions: [] })).success).toBe(false);
    expect((await removeTeamMember({ userId: fixtureIds.ownerA })).success).toBe(false);
    expect(await db.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: fixtureIds.workspaceA, userId: fixtureIds.ownerA } },
    })).toBeNull();
    expect((await db.workspace.findUniqueOrThrow({ where: { id: fixtureIds.workspaceA } })).ownerId).toBe(fixtureIds.ownerA);
  });

  it("does not let a caller switch into an unrelated workspace", async () => {
    await actAsUser(fixtureIds.ownerA);

    expect((await switchWorkspace({ id: fixtureIds.workspaceB })).success).toBe(false);
    expect((await db.user.findUniqueOrThrow({ where: { id: fixtureIds.ownerA } })).activeWorkspaceId).toBe(fixtureIds.workspaceA);
  });

  it("limits a shared client email to projects with explicit access rows", async () => {
    const projects = await getPortalHomeProjects("shared@example.test");
    expect(projects.map((project) => project.id)).toEqual([fixtureIds.projectA]);
  });

  it("returns the same not-found response for an inaccessible file", async () => {
    restoreSubject?.();
    restoreSubject = setSubjectAdapters({
      getUser: async () => null,
      getClient: async () => ({ email: "no-access@example.test", sessionId: "itest_session" }),
    });

    const response = await downloadFile(
      new NextRequest("http://localhost/api/files/itest_file/download"),
      { params: Promise.resolve({ id: fixtureIds.file }) },
    );
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "File not found" });
  });

});
