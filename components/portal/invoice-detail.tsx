import { Receipt, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/presentational/empty-state";
import { formatDate, formatCurrency } from "@/lib/presentational/format";
import { INVOICE_STATUS_CONFIG_PORTAL } from "@/lib/presentational/status";

type PortalInvoice = {
  id: string;
  invoiceNumber: string;
  description: string | null;
  subtotal: string;
  taxRate: string;
  taxAmount: string;
  amount: string;
  currency: string;
  dueDate: Date | null;
  paidAt: Date | null;
  paymentNotes: string | null;
  status: string;
  createdAt: Date;
  lineItems: {
    description: string;
    quantity: number;
    unitPrice: string;
    amount: string;
  }[];
};

export function PortalInvoiceSection({
  invoices,
}: {
  invoices: PortalInvoice[];
}) {
  if (invoices.length === 0) {
    return (
      <section className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Receipt className="size-5 text-muted-foreground" />
          Invoices
        </h2>
        <EmptyState
          icon={<Receipt className="size-5 text-muted-foreground" />}
          title="No invoices yet"
          description="Invoices for this project will appear here."
        />
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Receipt className="size-5 text-muted-foreground" />
        Invoices
        <span className="text-sm font-normal text-muted-foreground">
          ({invoices.length})
        </span>
      </h2>

      <div className="space-y-4">
        {invoices.map((invoice) => {
          const statusConfig =
            INVOICE_STATUS_CONFIG_PORTAL[invoice.status] ??
            INVOICE_STATUS_CONFIG_PORTAL.DRAFT;

          return (
            <Card key={invoice.id} className="shadow-xs">
              <CardContent className="p-5 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{invoice.invoiceNumber}</h3>
                      <Badge variant={statusConfig.variant}>
                        {statusConfig.label}
                      </Badge>
                    </div>
                    {invoice.description && (
                      <p className="text-xs text-muted-foreground">
                        {invoice.description}
                      </p>
                    )}
                  </div>
                  <a
                    href={`/api/invoices/${invoice.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm">
                      <Download className="mr-1 h-3.5 w-3.5" />
                      Download PDF
                    </Button>
                  </a>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground block mb-1">
                      Issue Date
                    </span>
                    <span className="font-medium">
                      {formatDate(invoice.createdAt)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">
                      Due Date
                    </span>
                    <span className="font-medium">
                      {formatDate(invoice.dueDate)}
                    </span>
                  </div>
                  {invoice.paidAt && (
                    <div>
                      <span className="text-muted-foreground block mb-1">
                        Paid On
                      </span>
                      <span className="font-medium text-green-600">
                        {formatDate(invoice.paidAt)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Line Items */}
                {invoice.lineItems.length > 0 && (
                  <div className="border border-border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="p-2 text-xs">
                            Description
                          </TableHead>
                          <TableHead className="p-2 text-xs w-16">
                            Qty
                          </TableHead>
                          <TableHead className="p-2 text-xs w-24">
                            Unit Price
                          </TableHead>
                          <TableHead className="p-2 text-xs w-24">
                            Amount
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoice.lineItems.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="p-2 text-xs">
                              {item.description}
                            </TableCell>
                            <TableCell className="p-2 text-xs">
                              {item.quantity}
                            </TableCell>
                            <TableCell className="p-2 text-xs">
                              {formatCurrency(
                                item.unitPrice,
                                invoice.currency,
                              )}
                            </TableCell>
                            <TableCell className="p-2 text-xs font-medium">
                              {formatCurrency(item.amount, invoice.currency)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="w-64 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">
                        {formatCurrency(invoice.subtotal, invoice.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Tax ({invoice.taxRate}%)
                      </span>
                      <span className="font-medium">
                        {formatCurrency(invoice.taxAmount, invoice.currency)}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-sm font-semibold">
                      <span>Total</span>
                      <span>
                        {formatCurrency(invoice.amount, invoice.currency)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment Notes */}
                {invoice.paymentNotes && (
                  <div className="bg-muted/50 rounded-md p-3 border border-border">
                    <p className="text-xs font-medium text-foreground mb-1">
                      Payment Instructions
                    </p>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                      {invoice.paymentNotes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
