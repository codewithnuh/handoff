"use client";

/**
 * DeliverableActions — approve/reject buttons + inline comment form.
 *
 * Uses optimistic locking: sends the current `version` with each mutation.
 * On success or CONFLICT the server component data is re-fetched via
 * router.refresh() so status and version always reflect the source of truth.
 */

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, RefreshCw, Send, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import {
  clientApproveDeliverable,
  clientRequestChanges,
} from "@/lib/actions/portal-actions";

interface DeliverableActionsProps {
  deliverableId: string;
  currentStatus: string;
  currentVersion: number;
}

export function DeliverableActions({
  deliverableId,
  currentStatus,
  currentVersion,
}: DeliverableActionsProps) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectComment, setRejectComment] = useState("");
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [conflict, setConflict] = useState(false);
  const router = useRouter();

  // Clients act only on submitted work; APPROVED is done,
  // CHANGES_REQUESTED stays actionable so they can re-review new versions.
  const isActionable =
    currentStatus === "IN_REVIEW" || currentStatus === "CHANGES_REQUESTED";

  async function handleApprove() {
    setLoading("approve");
    setConflict(false);
    try {
      const result = await clientApproveDeliverable(deliverableId, currentVersion);
      if (result.ok) {
        toast.add({ type: "success", title: "Approved", description: result.message });
        router.refresh();
      } else if (result.code === "CONFLICT") {
        setConflict(true);
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
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setLoading(null);
    }
  }

  async function handleReject() {
    setLoading("reject");
    setConflict(false);
    try {
      const result = await clientRequestChanges(
        deliverableId,
        currentVersion,
        rejectComment || undefined,
      );
      if (result.ok) {
        setRejectComment("");
        setShowRejectForm(false);
        toast.add({ type: "success", title: "Changes requested", description: result.message });
        router.refresh();
      } else if (result.code === "CONFLICT") {
        setConflict(true);
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
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setLoading(null);
    }
  }

  if (conflict) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-xs dark:border-yellow-800 dark:bg-yellow-950">
        <RefreshCw className="size-4 shrink-0 text-yellow-600 dark:text-yellow-400" />
        <div className="flex-1">
          <p className="font-medium text-yellow-800 dark:text-yellow-200">
            This deliverable was modified
          </p>
          <p className="text-yellow-700 dark:text-yellow-300">
            Someone else changed it. Refresh to see the latest version.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.refresh()}
          className="shrink-0"
        >
          <RefreshCw className="size-3.5 mr-1" />
          Refresh
        </Button>
      </div>
    );
  }

  if (!isActionable) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleApprove}
          disabled={loading !== null}
          className="border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300"
        >
          {loading === "approve" ? (
            <RefreshCw className="size-3.5 mr-1.5 animate-spin" />
          ) : (
            <CheckCircle2 className="size-3.5 mr-1.5" />
          )}
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowRejectForm(!showRejectForm)}
          disabled={loading !== null}
          className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
        >
          <XCircle className="size-3.5 mr-1.5" />
          Request Changes
        </Button>
      </div>

      {showRejectForm && (
        <div className="space-y-2 rounded-md border border-border p-3">
          <Textarea
            placeholder="What needs to change? (optional)"
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            rows={3}
            className="text-xs"
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleReject}
              disabled={loading !== null}
            >
              {loading === "reject" ? (
                <RefreshCw className="size-3.5 mr-1.5 animate-spin" />
              ) : (
                <Send className="size-3.5 mr-1.5" />
              )}
              Submit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowRejectForm(false);
                setRejectComment("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
