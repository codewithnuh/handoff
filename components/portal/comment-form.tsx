"use client";

/**
 * CommentForm — inline form for adding comments to deliverables or requests.
 * The server re-renders the comment list via router.refresh() after posting.
 */

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { clientAddComment } from "@/lib/actions/portal-actions";

interface CommentFormProps {
  targetType: "deliverable" | "request";
  targetId: string;
}

export function CommentForm({ targetType, targetId }: CommentFormProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!content.trim() || loading) return;

    setLoading(true);
    try {
      const result = await clientAddComment(targetType, targetId, content);
      if (result.ok) {
        setContent("");
        toast.add({ type: "success", title: "Comment added" });
        router.refresh();
      } else {
        toast.add({
          type: "error",
          title: "Error",
          description: result.error,
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
  );
}
