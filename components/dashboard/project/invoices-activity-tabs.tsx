import { Receipt, Activity as ActivityIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { ProjectDetailData } from "@/lib/queries/project";
import { InvoiceStatusBadge } from "./status-badges";
import { activityLabel } from "@/lib/constants/activity";
import { formatDate, formatDateTime, formatCurrency } from "./format";
import { EmptyTab } from "./empty-tab";

export function InvoicesTab({
  invoices,
}: {
  invoices: ProjectDetailData["invoices"];
}) {
  if (invoices.length === 0) {
    return (
      <EmptyTab
        icon={<Receipt className="size-5 text-muted-foreground" />}
        title="No invoices yet"
        description="Invoices for this project will appear here."
      />
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden shadow-xs">
      <table className="w-full text-left text-xs">
        <thead className="bg-muted/50 border-b border-border text-muted-foreground">
          <tr>
            <th className="p-3 font-medium">Invoice #</th>
            <th className="p-3 font-medium">Description</th>
            <th className="p-3 font-medium">Due Date</th>
            <th className="p-3 font-medium">Amount</th>
            <th className="p-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {invoices.map((inv) => (
            <tr key={inv.id} className="hover:bg-muted/25 transition-colors">
              <td className="p-3 font-medium">{inv.invoiceNumber}</td>
              <td className="p-3 text-muted-foreground">
                {inv.description || "—"}
              </td>
              <td className="p-3 text-muted-foreground">
                {formatDate(inv.dueDate)}
              </td>
              <td className="p-3 font-medium">
                {formatCurrency(inv.amount, inv.currency)}
              </td>
              <td className="p-3">
                <InvoiceStatusBadge status={inv.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ActivityTab({
  activities,
}: {
  activities: ProjectDetailData["activities"];
}) {
  if (activities.length === 0) {
    return (
      <EmptyTab
        icon={<ActivityIcon className="size-5 text-muted-foreground" />}
        title="No activity yet"
        description="Activity for this project will appear here."
      />
    );
  }

  return (
    <Card className="shadow-xs">
      <CardContent className="p-5">
        <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
          {activities.map((act) => (
            <div key={act.id} className="relative text-xs space-y-1">
              <div className="absolute -left-6 top-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background" />
              <div className="flex items-center gap-2">
                <span className="font-semibold">
                  {act.actorName ?? "System"}
                </span>
                <span className="text-muted-foreground">
                  • {formatDateTime(act.createdAt)}
                </span>
              </div>
              <p className="text-muted-foreground">{activityLabel(act.type)}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
