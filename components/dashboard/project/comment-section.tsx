"use client";

/**
 * DashboardCommentSection — displays comments and provides a form for
 * freelancers to add comments to deliverables or requests.
 */

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { addComment } from "@/lib/actions/comment";

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
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!content.trim() || loading) return;

    setLoading(true);
    try {
      const result = await addComment({ targetType, targetId, content });
      if (result.success) {
        setContent("");
        toast.add({ type: "success", title: "Comment added" });
        router.refresh();
      } else {
        toast.add({
          type: "error",
          title: "Error",
          description: result.message,
        });
      }
    } catch {
      toast.add({
        type: "error",
        title: "Error",
        description: "Failed to add comment",
      });
    } finally {
      setLoading(false);
    }
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
          disabled={!content.trim() || loading}
          className="shrink-0 self-end"
        >
          {loading ? (
            <RefreshCw className="size-3.5 animate-spin" />
          ) : (
            <Send className="size-3.5" />
          )}
        </Button>
      </form>
    </div>
  );
}
