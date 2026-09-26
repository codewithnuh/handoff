"use client";

/**
 * RequestForm — form for clients to submit new requests from the portal.
 * The request list is re-rendered via router.refresh() after posting.
 */

import React, { useState } from "react";
import { Plus, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { clientCreateRequest } from "@/lib/actions/portal-actions";
import { useServerAction } from "@/hooks/use-server-action";

interface RequestFormProps {
  projectId: string;
}

export function RequestForm({ projectId }: RequestFormProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const submit = useServerAction(clientCreateRequest, {
    success: "Request submitted",
    failure: "Error",
    thrown: "Error",
    thrownDescription: () => "Failed to submit request",
    onSuccess: () => {
      setTitle("");
      setDescription("");
      setOpen(false);
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || submit.pending) return;

    await submit.run({
      projectId,
      title,
      description: description || undefined,
    });
  }

  if (!open) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        <Plus className="size-3.5" />
        New Request
      </Button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full mt-2  rounded-md border border-border p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium">New Request</h4>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => {
            setOpen(false);
            setTitle("");
            setDescription("");
          }}
        >
          <X className="size-3.5" />
        </Button>
      </div>
      <Input
        placeholder="What do you need?"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="text-xs"
        autoFocus
      />
      <Textarea
        placeholder="Details (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        className="text-xs resize-none"
      />
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={!title.trim() || submit.pending}>
          {submit.pending ? (
            <RefreshCw className="size-3.5 mr-1.5 animate-spin" />
          ) : (
            <Plus className="size-3.5 mr-1.5" />
          )}
          Submit Request
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            setOpen(false);
            setTitle("");
            setDescription("");
          }}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
