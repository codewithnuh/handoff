"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, CheckCircle, XCircle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { sendInvoice, markInvoicePaid, cancelInvoice } from "@/lib/actions/invoice";

interface InvoiceActionsProps {
  invoiceId: string;
  status: string;
}

export function InvoiceActions({ invoiceId, status }: InvoiceActionsProps) {
  const [loading, setLoading] = useState<
    "send" | "paid" | "cancel" | null
  >(null);
  const router = useRouter();

  const handleSend = async () => {
    setLoading("send");
    try {
      const result = await sendInvoice({ id: invoiceId });
      if (result.success) {
        toast.add({ type: "success", title: "Invoice sent" });
        router.refresh();
      } else {
        toast.add({
          type: "error",
          title: "Failed to send",
          description: result.message,
        });
      }
    } catch {
      toast.add({
        type: "error",
        title: "Something went wrong",
        description: "Please try again.",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleMarkPaid = async () => {
    setLoading("paid");
    try {
      const result = await markInvoicePaid({ id: invoiceId });
      if (result.success) {
        toast.add({ type: "success", title: "Invoice marked as paid" });
        router.refresh();
      } else {
        toast.add({
          type: "error",
          title: "Failed to mark as paid",
          description: result.message,
        });
      }
    } catch {
      toast.add({
        type: "error",
        title: "Something went wrong",
        description: "Please try again.",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleCancel = async () => {
    setLoading("cancel");
    try {
      const result = await cancelInvoice({ id: invoiceId });
      if (result.success) {
        toast.add({ type: "success", title: "Invoice cancelled" });
        router.refresh();
      } else {
        toast.add({
          type: "error",
          title: "Failed to cancel",
          description: result.message,
        });
      }
    } catch {
      toast.add({
        type: "error",
        title: "Something went wrong",
        description: "Please try again.",
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {status === "DRAFT" && (
        <Button
          size="sm"
          onClick={handleSend}
          disabled={loading !== null}
        >
          {loading === "send" ? (
            <RefreshCw className="size-3.5 mr-1.5 animate-spin" />
          ) : (
            <Send className="size-3.5 mr-1.5" />
          )}
          Send Invoice
        </Button>
      )}

      {(status === "SENT" || status === "OVERDUE") && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleMarkPaid}
          disabled={loading !== null}
          className="border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300"
        >
          {loading === "paid" ? (
            <RefreshCw className="size-3.5 mr-1.5 animate-spin" />
          ) : (
            <CheckCircle className="size-3.5 mr-1.5" />
          )}
          Mark as Paid
        </Button>
      )}

      {status !== "PAID" && status !== "CANCELLED" && (
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCancel}
          disabled={loading !== null}
          className="text-destructive hover:text-destructive"
        >
          {loading === "cancel" ? (
            <RefreshCw className="size-3.5 mr-1.5 animate-spin" />
          ) : (
            <XCircle className="size-3.5 mr-1.5" />
          )}
          Cancel
        </Button>
      )}
    </div>
  );
}
