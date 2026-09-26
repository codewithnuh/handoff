"use client";

import { MessageSquare } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@/components/ui/select";
import type { ProjectDetailData } from "@/lib/queries/project-detail";
import type { ViewerPermissions } from "./types";
import { updateRequestStatus } from "@/lib/actions/request";
import { useServerAction } from "@/hooks/use-server-action";
import { RequestStatusBadge } from "./status-badges";
import { REQUEST_STATUS_CONFIG } from "@/lib/presentational/status";
import { formatDate } from "@/lib/presentational/format";
import { EmptyState } from "@/components/presentational/empty-state";
import { DashboardCommentSection } from "./comment-section";

export function RequestsTab({
  requests,
  permissions,
  currentUserId,
}: {
  requests: ProjectDetailData["requests"];
  permissions: ViewerPermissions;
  currentUserId: string;
}) {
  const update = useServerAction(updateRequestStatus, {
    success: "Status updated",
    successDescription: (data) =>
      `Request marked as ${data.status.replace(/_/g, " ").toLowerCase()}.`,
    failure: "Update failed",
  });

  const handleStatusChange = async (requestId: string, newStatus: string) => {
    const req = requests.find((r) => r.id === requestId);
    if (!req || req.status === newStatus) return;
    await update.run({
      id: requestId,
      status: newStatus as "OPEN" | "IN_PROGRESS" | "COMPLETED",
    });
  };

  if (requests.length === 0) {
    return (
      <EmptyState
        className="space-y-4"
        icon={<MessageSquare className="size-5 text-muted-foreground" />}
        title="No client requests"
        description="Client work requests will appear here."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      {requests.map((req) => (
        <Card key={req.id} className="shadow-xs">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{req.title}</span>
                  <RequestStatusBadge status={req.status} />
                </div>
                {req.description && (
                  <p className="text-xs text-muted-foreground">
                    {req.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right text-xs text-muted-foreground">
                  <span>Submitted {formatDate(req.createdAt)}</span>
                </div>
                {permissions.canUpdateRequests ? (
                  <Select
                    value={req.status}
                    onValueChange={(val) => {
                      if (val) handleStatusChange(req.id, val);
                    }}
                    disabled={update.pending}
                  >
                    <SelectTrigger className="w-[130px] h-8 text-xs">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {Object.entries(REQUEST_STATUS_CONFIG).map(
                          ([value, { label }]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ),
                        )}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                ) : null}
              </div>
            </div>

            {/* Comments */}
            <div className="border-t border-border pt-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <MessageSquare className="h-3.5 w-3.5" />
                <span className="font-medium">
                  Comments ({req.comments.length})
                </span>
              </div>
              <DashboardCommentSection
                targetType="request"
                targetId={req.id}
                comments={req.comments}
                currentUserId={currentUserId}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
