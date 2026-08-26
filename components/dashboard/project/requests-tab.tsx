"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { toast } from "@/components/ui/toast";
import type { ProjectDetailData } from "@/lib/queries/project";
import type { ViewerPermissions } from "./types";
import { updateRequestStatus } from "@/lib/actions/request";
import { RequestStatusBadge } from "./status-badges";
import { formatDate } from "./format";
import { EmptyTab } from "./empty-tab";

export function RequestsTab({
  requests,
  permissions,
}: {
  requests: ProjectDetailData["requests"];
  permissions: ViewerPermissions;
}) {
  const router = useRouter();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleStatusChange = async (requestId: string, newStatus: string) => {
    const req = requests.find((r) => r.id === requestId);
    if (!req || req.status === newStatus) return;
    setUpdatingId(requestId);
    try {
      const result = await updateRequestStatus({
        id: requestId,
        status: newStatus as "OPEN" | "IN_PROGRESS" | "COMPLETED",
      });
      if (!result.success) {
        toast.add({
          type: "error",
          title: "Update failed",
          description: result.message,
        });
      } else {
        toast.add({
          type: "success",
          title: "Status updated",
          description: `Request marked as ${newStatus.replace(/_/g, " ").toLowerCase()}.`,
        });
      }
    } catch {
      toast.add({
        type: "error",
        title: "Something went wrong",
        description: "Please try again.",
      });
    } finally {
      setUpdatingId(null);
      router.refresh();
    }
  };

  if (requests.length === 0) {
    return (
      <EmptyTab
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
          <CardContent className="p-4 flex items-center justify-between gap-3">
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
                  disabled={updatingId === req.id}
                >
                  <SelectTrigger className="w-[130px] h-8 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="OPEN">Open</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
