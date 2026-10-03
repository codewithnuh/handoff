import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/prisma";
import {
  createClient,
  listClients,
} from "@/lib/actions/client";
import { updateWorkspace } from "@/lib/actions/workspace";
import { createProject, updateProjectProgress } from "@/lib/actions/project";
import { createTask, reorderTasks, updateTask } from "@/lib/actions/task";
import { updateRequestStatus } from "@/lib/actions/request";
import { addComment } from "@/lib/actions/comment";
import {
  listProjectMembers,
  listTeamMembers,
  removeTeamMember,
  updateMemberPermissions,
  updateProjectMemberRole,
  updateTeamMemberRole,
} from "@/lib/actions/team";
import { setSubjectAdapters } from "@/lib/access";
import { getDashboardOverview } from "@/lib/queries/dashboard";
import { getProjectTasks } from "@/lib/queries/tasks";
import { fixtureIds, seedIntegrationFixtures } from "./fixtures";

// Server actions use this marker to prevent client imports. Integration tests
// run them directly in Node, where that Next.js boundary does not apply.
vi.mock("server-only", () => ({}));

let restoreSubject: (() => void) | undefined;

async function actAs(userId: string) {
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
    where: { id: { in: [fixtureIds.lead, fixtureIds.contributor, fixtureIds.observer] } },
    data: { activeWorkspaceId: fixtureIds.workspaceA },
  });
  await actAs(fixtureIds.ownerA);
});

afterAll(() => restoreSubject?.());

describe("domain regressions against PostgreSQL", () => {
  it("updates workspace settings for its owner and returns the persisted value", async () => {
    const before = await db.workspace.findUniqueOrThrow({
      where: { id: fixtureIds.workspaceA },
    });
    const result = await updateWorkspace({ name: "COD-83 workspace" });
    const after = await db.workspace.findUniqueOrThrow({
      where: { id: fixtureIds.workspaceA },
    });

    expect(result.success).toBe(true);
    expect(after.name).toBe("COD-83 workspace");
    await db.workspace.update({
      where: { id: fixtureIds.workspaceA },
      data: { name: before.name },
    });
  });

  it("normalizes client email, returns it from the action and rejects invalid or duplicate input without writes", async () => {
    const email = "cod-83-client@example.test";
    const created = await createClient({
      name: "  Regression Client  ",
      email: `  ${email.toUpperCase()}  `,
      company: "  Example Studio  ",
    });

    expect(created.success).toBe(true);
    const stored = await db.client.findUnique({
      where: {
        workspaceId_email: { workspaceId: fixtureIds.workspaceA, email },
      },
    });
    expect(stored).toMatchObject({
      name: "Regression Client",
      email,
      company: "Example Studio",
    });

    const listed = await listClients();
    expect(listed.success).toBe(true);
    if (listed.success) {
      expect(listed.data.items.map((client) => client.id)).toContain(stored?.id);
    }

    const countBeforeInvalidWrites = await db.client.count({
      where: { workspaceId: fixtureIds.workspaceA },
    });
    const invalid = await createClient({
      name: "",
      email: "invalid-email",
      company: undefined,
    });
    const duplicate = await createClient({
      name: "Duplicate",
      email: "SHARED@example.test",
      company: undefined,
    });

    expect(invalid.success).toBe(false);
    expect(duplicate.success).toBe(false);
    expect(
      await db.client.count({ where: { workspaceId: fixtureIds.workspaceA } }),
    ).toBe(countBeforeInvalidWrites);
  });

  it("persists valid projects and rejects out-of-range progress without changing them", async () => {
    const created = await createProject({
      clientId: fixtureIds.clientA,
      name: "COD-83 persisted project",
      progress: 40,
      startDate: new Date("2026-02-01T00:00:00.000Z"),
      dueDate: new Date("2026-03-01T00:00:00.000Z"),
    });
    expect(created.success).toBe(true);
    if (!created.success) return;

    const before = await db.project.findUniqueOrThrow({
      where: { id: created.data.id },
    });
    const invalid = await updateProjectProgress({
      id: created.data.id,
      progress: 101,
    });
    const after = await db.project.findUniqueOrThrow({
      where: { id: created.data.id },
    });

    expect(invalid.success).toBe(false);
    expect(after.progress).toBe(before.progress);
    expect(after.startDate).toEqual(new Date("2026-02-01T00:00:00.000Z"));
    expect(after.dueDate).toEqual(new Date("2026-03-01T00:00:00.000Z"));
  });

  it("serializes concurrent project creation at the free-plan limit", async () => {
    const ownerId = "itest_cod83_plan_owner";
    const workspaceId = "itest_cod83_plan_workspace";
    const clientId = "itest_cod83_plan_client";
    await db.user.upsert({
      where: { id: ownerId },
      update: {},
      create: {
        id: ownerId,
        name: "Plan limit owner",
        email: "cod83-plan-owner@example.test",
        emailVerified: true,
      },
    });
    await db.workspace.upsert({
      where: { id: workspaceId },
      update: {},
      create: { id: workspaceId, name: "Plan limit workspace", ownerId },
    });
    await db.user.update({
      where: { id: ownerId },
      data: { activeWorkspaceId: workspaceId },
    });
    await db.client.upsert({
      where: { id: clientId },
      update: {},
      create: {
        id: clientId,
        workspaceId,
        name: "Plan limit client",
        email: "cod83-plan-client@example.test",
      },
    });
    for (const id of ["itest_cod83_plan_project_1", "itest_cod83_plan_project_2"]) {
      await db.project.upsert({
        where: { id },
        update: {},
        create: { id, workspaceId, clientId, name: id },
      });
    }
    await actAs(ownerId);

    const results = await Promise.all([
      createProject({ clientId, name: "Concurrent project one" }),
      createProject({ clientId, name: "Concurrent project two" }),
    ]);

    expect(results.filter((result) => result.success)).toHaveLength(1);
    expect(
      results.filter((result) => !result.success).map((result) =>
        result.success ? null : result.error.code,
      ),
    ).toEqual(["PLAN_LIMIT_EXCEEDED"]);
    expect(await db.project.count({ where: { workspaceId } })).toBe(3);
    await actAs(fixtureIds.ownerA);
  });

  it("creates and reorders project tasks, rejects foreign or duplicate task IDs atomically, and serves persisted board data", async () => {
    const foreignProject = await db.project.upsert({
      where: { id: "itest_cod83_other_project" },
      update: {},
      create: {
        id: "itest_cod83_other_project",
        workspaceId: fixtureIds.workspaceA,
        clientId: fixtureIds.clientA,
        name: "Other task project",
      },
    });
    const foreignTask = await db.task.upsert({
      where: { id: "itest_cod83_other_task" },
      update: {},
      create: {
        id: "itest_cod83_other_task",
        projectId: foreignProject.id,
        title: "Other project task",
      },
    });

    const created = await createTask({
      projectId: fixtureIds.projectA,
      title: "COD-83 task",
    });
    expect(created.success).toBe(true);
    if (!created.success) return;

    const firstMove = await reorderTasks({
      projectId: fixtureIds.projectA,
      items: [{ id: created.data.id, status: "IN_PROGRESS", position: 4 }],
    });
    expect(firstMove.success).toBe(true);

    const beforeRejectedMove = await db.task.findUniqueOrThrow({
      where: { id: created.data.id },
    });
    const foreignMove = await reorderTasks({
      projectId: fixtureIds.projectA,
      items: [
        { id: created.data.id, status: "DONE", position: 9 },
        { id: foreignTask.id, status: "DONE", position: 10 },
      ],
    });
    const duplicateMove = await reorderTasks({
      projectId: fixtureIds.projectA,
      items: [
        { id: created.data.id, status: "DONE", position: 9 },
        { id: created.data.id, status: "DONE", position: 10 },
      ],
    });
    const afterRejectedMove = await db.task.findUniqueOrThrow({
      where: { id: created.data.id },
    });
    const board = await getProjectTasks(fixtureIds.projectA);

    expect(foreignMove.success).toBe(false);
    expect(duplicateMove.success).toBe(false);
    expect(afterRejectedMove).toMatchObject({
      status: beforeRejectedMove.status,
      position: beforeRejectedMove.position,
    });
    expect(board?.find((task) => task.id === created.data.id)).toMatchObject({
      status: "IN_PROGRESS",
      position: 4,
    });
  });

  it("denies observer task edits without changing persisted task data", async () => {
    const taskBefore = await db.task.findUniqueOrThrow({
      where: { id: fixtureIds.task },
    });
    await actAs(fixtureIds.observer);

    const result = await updateTask({
      id: fixtureIds.task,
      title: "Unauthorized task edit",
    });
    const taskAfter = await db.task.findUniqueOrThrow({
      where: { id: fixtureIds.task },
    });

    expect(result.success).toBe(false);
    expect(taskAfter.title).toBe(taskBefore.title);
    await actAs(fixtureIds.ownerA);
  });

  it("updates a request and dashboard query output, while rejecting an invalid status without activity", async () => {
    await db.request.update({
      where: { id: fixtureIds.request },
      data: { status: "OPEN" },
    });
    const before = await getDashboardOverview();
    const activityCount = await db.activity.count({
      where: { projectId: fixtureIds.projectA, type: "REQUEST_STATUS_CHANGED" },
    });

    const updated = await updateRequestStatus({
      id: fixtureIds.request,
      status: "COMPLETED",
    });
    const invalid = await updateRequestStatus({
      id: fixtureIds.request,
      status: "NOT_A_STATUS" as never,
    });
    const stored = await db.request.findUniqueOrThrow({
      where: { id: fixtureIds.request },
    });
    const after = await getDashboardOverview();

    expect(updated.success).toBe(true);
    expect(invalid.success).toBe(false);
    expect(stored.status).toBe("COMPLETED");
    expect(after?.openRequestCount).toBe((before?.openRequestCount ?? 0) - 1);
    expect(
      await db.activity.count({
        where: {
          projectId: fixtureIds.projectA,
          type: "REQUEST_STATUS_CHANGED",
        },
      }),
    ).toBe(activityCount + 1);
  });

  it("stores comments under the selected target and rejects empty or mismatched targets without writes", async () => {
    const before = await db.comment.count({
      where: { requestId: fixtureIds.request },
    });
    const added = await addComment({
      targetType: "request",
      targetId: fixtureIds.request,
      content: "  Persisted request comment  ",
    });
    expect(added.success).toBe(true);
    if (!added.success) return;

    const stored = await db.comment.findUniqueOrThrow({
      where: { id: added.data.id },
    });
    const empty = await addComment({
      targetType: "request",
      targetId: fixtureIds.request,
      content: "   ",
    });
    const wrongTarget = await addComment({
      targetType: "deliverable",
      targetId: fixtureIds.request,
      content: "Wrong target type",
    });

    expect(stored).toMatchObject({
      content: "Persisted request comment",
      requestId: fixtureIds.request,
      deliverableId: null,
      authorUserId: fixtureIds.ownerA,
    });
    expect(empty.success).toBe(false);
    expect(wrongTarget.success).toBe(false);
    expect(
      await db.comment.count({ where: { requestId: fixtureIds.request } }),
    ).toBe(before + 1);
  });

  it("keeps project assignments through role changes and removes workspace and project access together", async () => {
    await db.projectMember.upsert({
      where: {
        projectId_userId: {
          projectId: fixtureIds.projectA,
          userId: fixtureIds.member,
        },
      },
      create: {
        projectId: fixtureIds.projectA,
        userId: fixtureIds.member,
        role: "CONTRIBUTOR",
      },
      update: { role: "CONTRIBUTOR" },
    });

    const assigned = await updateProjectMemberRole({
      projectId: fixtureIds.projectA,
      userId: fixtureIds.member,
      role: "LEAD",
    });
    const promoted = await updateTeamMemberRole({
      userId: fixtureIds.member,
      role: "ADMIN",
    });
    const permissionUpdate = await updateMemberPermissions({
      userId: fixtureIds.member,
      permissions: ["MANAGE_CLIENTS"],
    });
    const members = await listTeamMembers();
    const assignments = await listProjectMembers({ projectId: fixtureIds.projectA });
    const invalidAssignment = await updateProjectMemberRole({
      projectId: fixtureIds.projectA,
      userId: fixtureIds.ownerB,
      role: "LEAD",
    });

    expect(assigned.success).toBe(true);
    expect(promoted.success).toBe(true);
    expect(permissionUpdate.success).toBe(true);
    expect(members.success).toBe(true);
    if (members.success) {
      expect(
        members.data.items.find((member) => member.userId === fixtureIds.member)
          ?.role,
      ).toBe("ADMIN");
    }
    expect(assignments.success).toBe(true);
    if (assignments.success) {
      expect(
        assignments.data.items.find((member) => member.userId === fixtureIds.member)
          ?.role,
      ).toBe("LEAD");
    }
    expect(invalidAssignment.success).toBe(false);
    expect(
      await db.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: fixtureIds.projectA,
            userId: fixtureIds.ownerB,
          },
        },
      }),
    ).toBeNull();

    const removed = await removeTeamMember({ userId: fixtureIds.member });
    expect(removed.success).toBe(true);
    expect(
      await db.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: fixtureIds.workspaceA,
            userId: fixtureIds.member,
          },
        },
      }),
    ).toBeNull();
    expect(
      await db.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: fixtureIds.projectA,
            userId: fixtureIds.member,
          },
        },
      }),
    ).toBeNull();
  });
});
