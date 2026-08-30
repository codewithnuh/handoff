import type { ViewerPermissions } from "@/lib/queries/project";

import type { Task } from "@/app/generated/prisma/client";

export type TabKey = "tasks" | "deliverables" | "requests" | "invoices" | "activity";

export type ProjectDetailProps = {
  data: import("@/lib/queries/project").ProjectDetailData;
  permissions: ViewerPermissions;
  initialTasks: Task[];
  currentUserId: string;
};

export type { ViewerPermissions };
