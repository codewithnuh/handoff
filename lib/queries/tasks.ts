import type { Task } from "@/app/generated/prisma/client";
import { db } from "@/lib/prisma";
import { resolveProjectAccess } from "@/lib/actions/guards";

/**
 * All tasks for a project, ordered for board rendering (column by status,
 * then explicit position). Returns null when the caller has no access.
 */
export async function getProjectTasks(
  projectId: string,
): Promise<Task[] | null> {
  const access = await resolveProjectAccess(projectId).catch(() => null);
  if (!access || !access.ok) return null;

  return db.task.findMany({
    where: { projectId },
    orderBy: [{ status: "asc" }, { position: "asc" }],
  });
}
