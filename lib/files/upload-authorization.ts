import { db } from "@/lib/prisma";
import { assertWorkspaceWritable } from "@/lib/services/plan-limits";

export async function authorizeProjectUpload(
  userId: string,
  projectId: string,
  deliverableId?: string,
) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true, workspaceId: true, workspace: { select: { ownerId: true } } },
  });
  if (!project) throw new Error("Project not found.");

  const workspaceMembership = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: project.workspaceId, userId } },
    select: { role: true },
  });
  const isOwner = project.workspace.ownerId === userId;
  const isAdmin = workspaceMembership?.role === "ADMIN";
  if (!isOwner && !workspaceMembership) throw new Error("You cannot upload to this project.");

  let canSubmitForReview = isOwner || isAdmin;
  if (!isOwner && !isAdmin) {
    const projectMembership = await db.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { role: true },
    });
    if (!projectMembership || projectMembership.role === "OBSERVER") {
      throw new Error("You cannot upload to this project.");
    }
    canSubmitForReview = projectMembership.role === "LEAD";
  }

  if (deliverableId) {
    const deliverable = await db.deliverable.findFirst({
      where: { id: deliverableId, projectId },
      select: { id: true, status: true },
    });
    if (!deliverable) throw new Error("Deliverable not found in this project.");
    if (deliverable.status !== "DRAFT" && !canSubmitForReview) {
      throw new Error("Only a project lead can upload versions after submission.");
    }
  }

  const readOnlyError = await assertWorkspaceWritable(project.workspaceId);
  if (readOnlyError) throw new Error(readOnlyError.message);

  return { projectId, workspaceId: project.workspaceId, userId };
}
