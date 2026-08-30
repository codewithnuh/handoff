"use client";

import { FileCheck } from "lucide-react";

import type { ProjectDetailData } from "@/lib/queries/project";
import type { ViewerPermissions } from "./types";
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
      <div className="rounded-lg space-y-4 border border-dashed border-muted-foreground/25 bg-muted/25 p-12 text-center">
        <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted">
          <FileCheck className="size-5 text-muted-foreground" />
        </div>
        <h3 className="mt-3 text-sm font-semibold">No deliverables yet</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Create your first deliverable to start tracking work.
        </p>
        {permissions.canManageDeliverables && (
          <CreateDeliverableDialog projectId={projectId} />
        )}
      </div>
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
            permissions={permissions}
            currentUserId={currentUserId}
          />
        ))}
      </div>
    </div>
  );
}
