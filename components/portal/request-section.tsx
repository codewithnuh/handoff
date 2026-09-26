"use client";

/**
 * RequestSection — displays existing requests with comments, and a form to
 * create new ones. Data comes straight from the server component; mutations
 * trigger router.refresh() so freelancer replies and status changes appear
 * on refresh without duplicating server state locally.
 */

import React from "react";
import { MessageSquare, Inbox } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CommentSection } from "./comment-section";
import { RequestForm } from "./request-form";
import { EmptyState } from "@/components/presentational/empty-state";
import { formatDate } from "@/lib/presentational/format";
import { REQUEST_STATUS_CONFIG } from "@/lib/presentational/status";

export interface PortalRequest {
  id: string;
  title: string;
  description: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  comments: {
    id: string;
    content: string;
    authorUserId: string | null;
    authorEmail: string | null;
    authorName: string | null;
    createdAt: Date;
  }[];
}

interface RequestSectionProps {
  projectId: string;
  requests: PortalRequest[];
  /** Email of the signed-in portal client */
  viewerEmail?: string;
}

export function RequestSection({
  projectId,
  requests,
  viewerEmail,
}: RequestSectionProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-start flex-col  justify-center">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="size-5 text-muted-foreground" />
          Requests
          <span className="text-sm font-normal text-muted-foreground">
            ({requests.length})
          </span>
        </h2>

        <RequestForm projectId={projectId} />
      </div>
      <div className="border-dotted border-neutral-500 border-t" />
      {requests.length === 0 ? (
        <EmptyState
          icon={<Inbox className="size-5 text-muted-foreground" />}
          title="No requests yet"
          description="Submit a request to ask for changes or new work."
        />
      ) : (
        <div className="space-y-3 ">
          {requests.map((req) => {
            const rStatus =
              REQUEST_STATUS_CONFIG[req.status] ?? REQUEST_STATUS_CONFIG.OPEN;

            return (
              <Card key={req.id} className="shadow-xs">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{req.title}</span>
                        <Badge
                          variant={rStatus.variant}
                          className="text-[10px]"
                        >
                          {rStatus.label}
                        </Badge>
                      </div>
                      {req.description && (
                        <p className="text-xs text-muted-foreground">
                          {req.description}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 ml-4">
                      {formatDate(req.createdAt)}
                    </span>
                  </div>

                  {/* Comments */}
                  <CommentSection
                    targetType="request"
                    targetId={req.id}
                    comments={req.comments}
                    viewerEmail={viewerEmail}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
