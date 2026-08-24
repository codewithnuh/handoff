import Link from "next/link";
import {
  Activity as ActivityIcon,
  CheckCircle2,
  MessageSquare,
  User,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { activityLabel } from "@/lib/constants/activity";
import type { RecentActivityItem } from "@/lib/queries/project";

function formatDateTime(date: Date): string {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Workspace-wide activity feed. Client actions (approvals, change
 * requests, comments) are highlighted so the freelancer immediately
 * sees what happened while they were away.
 */
export function RecentActivity({ items }: { items: RecentActivityItem[] }) {
  return (
    <Card className="shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <ActivityIcon className="size-4 text-muted-foreground" />
          Recent Activity
        </CardTitle>
        <span className="text-[10px] text-muted-foreground">
          client actions highlighted
        </span>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-border">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/dashboard/projects/${item.projectId}`}
              className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0 group"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full ${
                    item.isClientAction
                      ? "bg-primary/10"
                      : "bg-muted"
                  }`}
                >
                  {item.isClientAction ? (
                    <User className="size-3 text-primary" />
                  ) : item.type === "COMMENT_ADDED" ||
                    item.type === "REQUEST_CREATED" ? (
                    <MessageSquare className="size-3 text-muted-foreground" />
                  ) : (
                    <CheckCircle2 className="size-3 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs">
                    <span className="font-medium">
                      {item.isClientAction
                        ? (item.actorName ?? item.actorEmail ?? "Client")
                        : (item.actorName ?? "You")}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {activityLabel(item.type)}
                    </span>
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {item.projectName}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {item.isClientAction && (
                  <Badge variant="secondary" className="text-[9px]">
                    Client
                  </Badge>
                )}
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {formatDateTime(item.createdAt)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
