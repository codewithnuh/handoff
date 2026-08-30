"use client";

import { useState } from "react";
import { Receipt, Activity as ActivityIcon, Eye } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { ProjectDetailData } from "@/lib/queries/project";
import type { ViewerPermissions } from "./types";
import { InvoiceStatusBadge } from "./status-badges";
import { activityLabel } from "@/lib/constants/activity";
import { formatDate, formatDateTime, formatCurrency } from "./format";
import { EmptyTab } from "./empty-tab";
import { CreateInvoiceDialog } from "./create-invoice-dialog";
import { InvoiceDetailDialog } from "./invoice-detail-dialog";
import { InvoiceActions } from "./invoice-actions";

type InvoiceItem = ProjectDetailData["invoices"][number];

type InvoiceWithLineItems = InvoiceItem & {
  subtotal?: string;
  taxRate?: string;
  taxAmount?: string;
  paidAt?: Date | null;
  paymentNotes?: string | null;
  lineItems?: {
    id: string;
    description: string;
    quantity: number;
    unitPrice: string;
    amount: string;
    deliverableId: string | null;
  }[];
};

export function InvoicesTab({
  invoices,
  permissions,
  projectId,
  approvedDeliverables,
  projectClient,
  userProfile,
}: {
  invoices: ProjectDetailData["invoices"];
  permissions: ViewerPermissions;
  projectId: string;
  approvedDeliverables: {
    id: string;
    title: string;
    description: string | null;
  }[];
  projectClient: {
    id: string;
    name: string;
    email: string;
    company: string | null;
  } | null;
  userProfile: {
    name: string;
    email: string;
  };
}) {
  const [selectedInvoice, setSelectedInvoice] =
    useState<InvoiceWithLineItems | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const handleViewInvoice = (invoice: InvoiceWithLineItems) => {
    setSelectedInvoice(invoice);
    setDetailOpen(true);
  };

  if (invoices.length === 0) {
    return (
      <div className="space-y-4">
        {permissions.canManageDeliverables && (
          <div className="flex justify-end">
            <CreateInvoiceDialog
              projectId={projectId}
              approvedDeliverables={approvedDeliverables}
              projectClient={projectClient}
              userProfile={userProfile}
            />
          </div>
        )}
        <EmptyTab
          icon={<Receipt className="text-muted-foreground size-5" />}
          title="No invoices yet"
          description="Create your first invoice for this project."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {permissions.canManageDeliverables && (
        <div className="flex justify-end">
          <CreateInvoiceDialog
            projectId={projectId}
            approvedDeliverables={approvedDeliverables}
            projectClient={projectClient}
            userProfile={userProfile}
          />
        </div>
      )}

      <div className="bg-card shadow-xs overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="p-3">Invoice #</TableHead>
              <TableHead className="p-3">Description</TableHead>
              <TableHead className="p-3">Due Date</TableHead>
              <TableHead className="p-3">Amount</TableHead>
              <TableHead className="p-3">Status</TableHead>
              <TableHead className="p-3 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="p-3 font-medium">
                  {inv.invoiceNumber}
                </TableCell>
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
                <TableCell className="p-3">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleViewInvoice(inv)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    {permissions.canManageDeliverables && (
                      <InvoiceActions
                        invoiceId={inv.id}
                        status={inv.status}
                      />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Invoice Detail Dialog */}
      {selectedInvoice && (
        <InvoiceDetailDialog
          invoice={{
            ...selectedInvoice,
            subtotal: selectedInvoice.subtotal ?? "0",
            taxRate: selectedInvoice.taxRate ?? "0",
            taxAmount: selectedInvoice.taxAmount ?? "0",
            paidAt: selectedInvoice.paidAt ?? null,
            paymentNotes: selectedInvoice.paymentNotes ?? null,
            lineItems: selectedInvoice.lineItems ?? [],
          }}
          open={detailOpen}
          onOpenChange={setDetailOpen}
        />
      )}
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
                  · {formatDateTime(act.createdAt)}
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
