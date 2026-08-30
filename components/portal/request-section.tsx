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

const REQUEST_STATUS: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  OPEN: { label: "Open", variant: "secondary" },
  IN_PROGRESS: { label: "In Progress", variant: "default" },
  COMPLETED: { label: "Completed", variant: "outline" },
};

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
        <div className="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/25 p-12 text-center">
          <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted">
            <Inbox className="size-5 text-muted-foreground" />
          </div>
          <h3 className="mt-3 text-sm font-semibold">No requests yet</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Submit a request to ask for changes or new work.
          </p>
        </div>
      ) : (
        <div className="space-y-3 ">
          {requests.map((req) => {
            const rStatus = REQUEST_STATUS[req.status] ?? REQUEST_STATUS.OPEN;

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
