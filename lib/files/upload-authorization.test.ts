import { beforeEach, describe, expect, it, vi } from "vitest";

const { projectFind, workspaceMemberFind, projectMemberFind, deliverableFind, writable } = vi.hoisted(() => ({
  projectFind: vi.fn(),
  workspaceMemberFind: vi.fn(),
  projectMemberFind: vi.fn(),
  deliverableFind: vi.fn(),
  writable: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  db: {
    project: { findUnique: projectFind },
    workspaceMember: { findUnique: workspaceMemberFind },
    projectMember: { findUnique: projectMemberFind },
    deliverable: { findFirst: deliverableFind },
  },
}));
vi.mock("@/lib/services/plan-limits", () => ({ assertWorkspaceWritable: writable }));

import { authorizeProjectUpload } from "./upload-authorization";

describe("project upload authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    projectFind.mockResolvedValue({ id: "project-a", workspaceId: "workspace-a", workspace: { ownerId: "owner" } });
    workspaceMemberFind.mockResolvedValue({ role: "MEMBER" });
    projectMemberFind.mockResolvedValue({ role: "CONTRIBUTOR" });
    deliverableFind.mockResolvedValue({ id: "deliverable-a", status: "DRAFT" });
    writable.mockResolvedValue(null);
  });

  it("allows a project contributor in a writable workspace", async () => {
    await expect(authorizeProjectUpload("contributor", "project-a")).resolves.toEqual({
      projectId: "project-a",
      workspaceId: "workspace-a",
      userId: "contributor",
    });
  });

  it("rejects observers, users outside the workspace, and read-only workspaces", async () => {
    projectMemberFind.mockResolvedValueOnce({ role: "OBSERVER" });
    await expect(authorizeProjectUpload("observer", "project-a")).rejects.toThrow();
    expect(writable).not.toHaveBeenCalled();

    workspaceMemberFind.mockResolvedValueOnce(null);
    await expect(authorizeProjectUpload("outsider", "project-a")).rejects.toThrow();

    writable.mockResolvedValueOnce({ message: "Workspace is read-only" });
    await expect(authorizeProjectUpload("contributor", "project-a")).rejects.toThrow("Workspace is read-only");
  });

  it("allows a workspace owner without a membership row", async () => {
    await expect(authorizeProjectUpload("owner", "project-a")).resolves.toMatchObject({ userId: "owner" });
    expect(projectMemberFind).not.toHaveBeenCalled();
  });

  it("checks submitted deliverable capability before upload allocation", async () => {
    deliverableFind.mockResolvedValueOnce({ id: "deliverable-a", status: "IN_REVIEW" });
    await expect(authorizeProjectUpload("contributor", "project-a", "deliverable-a")).rejects.toThrow("Only a project lead");

    projectMemberFind.mockResolvedValueOnce({ role: "LEAD" });
    deliverableFind.mockResolvedValueOnce({ id: "deliverable-a", status: "IN_REVIEW" });
    await expect(authorizeProjectUpload("lead", "project-a", "deliverable-a")).resolves.toMatchObject({ projectId: "project-a" });
  });
});
