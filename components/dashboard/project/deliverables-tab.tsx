"use client";

import { FileCheck } from "lucide-react";

import type { ProjectDetailData } from "@/lib/queries/project-detail";
import type { ViewerPermissions } from "./types";
import { EmptyState } from "@/components/presentational/empty-state";
import { DeliverableCard } from "./deliverable-card";
import { CreateDeliverableDialog } from "./create-deliverable-dialog";

export function DeliverablesTab({
  deliverables,
  projectId,
  permissions,
  currentUserId,
}: {
  deliverables: ProjectDetailData["deliverables"];
  projectId: string;
  permissions: ViewerPermissions;
  currentUserId: string;
}) {
  if (deliverables.length === 0) {
    return (
      <EmptyState
        className="space-y-4"
        icon={<FileCheck className="size-5 text-muted-foreground" />}
        title="No deliverables yet"
        description="Create your first deliverable to start tracking work."
      >
        {permissions.canManageDeliverables && (
          <CreateDeliverableDialog projectId={projectId} />
        )}
      </EmptyState>
    );
  }

  return (
    <div className="space-y-4">
      {permissions.canManageDeliverables && (
        <div className="flex justify-end">
          <CreateDeliverableDialog projectId={projectId} />
        </div>
      )}
      <div className="grid grid-cols-1 gap-4">
        {deliverables.map((item) => (
          <DeliverableCard
            key={item.id}
            item={item}
            projectId={projectId}
            permissions={permissions}
            currentUserId={currentUserId}
          />
        ))}
      </div>
    </div>
  );
}
