"use client";

/**
 * CommentSection — displays existing comments and provides a form to add
 * new ones. Used under each deliverable and request in the portal.
 *
 * Comments come straight from the server component; after posting we call
 * router.refresh() so both sides' comments stay in sync without duplicating
 * server data into local state.
 */

import React from "react";
import { CommentForm } from "./comment-form";

export interface PortalComment {
  id: string;
  content: string;
  authorUserId: string | null;
  authorEmail: string | null;
  authorName: string | null;
  createdAt: Date;
}

interface CommentSectionProps {
  targetType: "deliverable" | "request";
  targetId: string;
  comments: PortalComment[];
  /** Email of the signed-in portal client (to style their own messages) */
  viewerEmail?: string;
}

function formatCommentDate(date: Date): string {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function CommentSection({
  targetType,
  targetId,
  comments,
  viewerEmail,
}: CommentSectionProps) {
  return (
    <div className="space-y-3">
      {comments.length > 0 && (
        <div className="space-y-2">
          {comments.map((comment) => {
            const isOwn =
              viewerEmail !== null &&
              comment.authorUserId === null &&
              comment.authorEmail !== null &&
              comment.authorEmail.toLowerCase() ===
                (viewerEmail ?? "").toLowerCase();

            return (
              <div
                key={comment.id}
                className={`rounded-md p-3 text-xs ${
                  isOwn
                    ? "bg-primary/5 border border-primary/10 ml-4"
                    : "bg-muted/50 border border-border mr-4"
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-medium">
                    {isOwn ? "You" : comment.authorName ?? "Team"}
                  </span>
                  <span className="text-muted-foreground">
                    · {formatCommentDate(comment.createdAt)}
                  </span>
                </div>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {comment.content}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <CommentForm targetType={targetType} targetId={targetId} />
    </div>
  );
}
