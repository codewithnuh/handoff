"use client";

/**
 * DashboardCommentSection — displays comments and provides a form for
 * freelancers to add comments to deliverables or requests.
 */

import React, { useState } from "react";
import { Send, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addComment } from "@/lib/actions/comment";
import { useServerAction } from "@/hooks/use-server-action";

export interface DashboardComment {
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
  comments: DashboardComment[];
  currentUserId?: string;
}

function formatCommentDate(date: Date): string {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function DashboardCommentSection({
  targetType,
  targetId,
  comments,
  currentUserId,
}: CommentSectionProps) {
  const [content, setContent] = useState("");
  const add = useServerAction(addComment, {
    success: "Comment added",
    failure: "Error",
    thrown: "Error",
    thrownDescription: () => "Failed to add comment",
    onSuccess: () => setContent(""),
  });

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!content.trim() || add.pending) return;

    await add.run({ targetType, targetId, content });
  }

  return (
    <div className="space-y-3">
      {comments.length > 0 && (
        <div className="space-y-2">
          {comments.map((comment) => {
            const isOwn = comment.authorUserId === currentUserId;

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

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Textarea
          placeholder="Add a comment..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={2}
          className="text-xs resize-none flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <Button
          type="submit"
          size="sm"
          variant="outline"
          disabled={!content.trim() || add.pending}
          className="shrink-0 self-end"
        >
          {add.pending ? (
            <RefreshCw className="size-3.5 animate-spin" />
          ) : (
            <Send className="size-3.5" />
          )}
        </Button>
      </form>
    </div>
  );
}
