import { Receipt, Activity as ActivityIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
        icon={<Receipt className="text-muted-foreground size-5" />}
        title="No invoices yet"
        description="Invoices for this project will appear here."
      />
    );
  }

  return (
    <div className="bg-card shadow-xs overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="p-3">Invoice #</TableHead>
            <TableHead className="p-3">Description</TableHead>
            <TableHead className="p-3">Due Date</TableHead>
            <TableHead className="p-3">Amount</TableHead>
            <TableHead className="p-3">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((inv) => (
            <TableRow key={inv.id}>
              <TableCell className="p-3 font-medium">{inv.invoiceNumber}</TableCell>
              <TableCell className="text-muted-foreground p-3">
                {inv.description || "—"}
              </TableCell>
              <TableCell className="text-muted-foreground p-3">
                {formatDate(inv.dueDate)}
              </TableCell>
              <TableCell className="p-3 font-medium">
                {formatCurrency(inv.amount, inv.currency)}
              </TableCell>
              <TableCell className="p-3">
                <InvoiceStatusBadge status={inv.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
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
