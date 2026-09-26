"use client";

import { Send, CheckCircle, XCircle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { sendInvoice, markInvoicePaid, cancelInvoice } from "@/lib/actions/invoice";
import { useServerAction } from "@/hooks/use-server-action";

interface InvoiceActionsProps {
  invoiceId: string;
  status: string;
}

export function InvoiceActions({ invoiceId, status }: InvoiceActionsProps) {
  const send = useServerAction(sendInvoice, {
    success: "Invoice sent",
    failure: "Failed to send",
  });
  const markPaid = useServerAction(markInvoicePaid, {
    success: "Invoice marked as paid",
    failure: "Failed to mark as paid",
  });
  const cancel = useServerAction(cancelInvoice, {
    success: "Invoice cancelled",
    failure: "Failed to cancel",
  });

  const pending = send.pending || markPaid.pending || cancel.pending;

  return (
    <div className="flex items-center gap-2">
      {status === "DRAFT" && (
        <Button
          size="sm"
          onClick={() => send.run({ id: invoiceId })}
          disabled={pending}
        >
          {send.pending ? (
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
          onClick={() => markPaid.run({ id: invoiceId })}
          disabled={pending}
          className="border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300"
        >
          {markPaid.pending ? (
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
          onClick={() => cancel.run({ id: invoiceId })}
          disabled={pending}
          className="text-destructive hover:text-destructive"
        >
          {cancel.pending ? (
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
