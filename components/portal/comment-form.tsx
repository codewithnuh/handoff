"use client";

/**
 * CommentForm — inline form for adding comments to deliverables or requests.
 * The server re-renders the comment list via router.refresh() after posting.
 */

import React, { useState } from "react";
import { Send, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { clientAddComment } from "@/lib/actions/portal-actions";
import { useServerAction } from "@/hooks/use-server-action";

interface CommentFormProps {
  targetType: "deliverable" | "request";
  targetId: string;
}

export function CommentForm({ targetType, targetId }: CommentFormProps) {
  const [content, setContent] = useState("");
  const addComment = useServerAction(clientAddComment, {
    success: "Comment added",
    failure: "Error",
    thrown: "Error",
    thrownDescription: () => "Failed to add comment",
    onSuccess: () => setContent(""),
  });

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!content.trim() || addComment.pending) return;

    await addComment.run({ targetType, targetId, content });
  }

  return (
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
        disabled={!content.trim() || addComment.pending}
        className="shrink-0 self-end"
      >
        {addComment.pending ? (
          <RefreshCw className="size-3.5 animate-spin" />
        ) : (
          <Send className="size-3.5" />
        )}
      </Button>
    </form>
  );
}
