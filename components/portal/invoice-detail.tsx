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

const INVOICE_STATUS: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  PAID: { label: "Paid", variant: "outline" },
  SENT: { label: "Pending", variant: "default" },
  OVERDUE: { label: "Overdue", variant: "destructive" },
  DRAFT: { label: "Draft", variant: "secondary" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
};

function formatDate(date: Date | null): string {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(amount: string, currency: string): string {
  const num = parseFloat(amount);
  if (isNaN(num)) return `${amount} ${currency}`;
  return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2 })} ${currency}`;
}

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
        <div className="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/25 p-12 text-center">
          <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted">
            <Receipt className="size-5 text-muted-foreground" />
          </div>
          <h3 className="mt-3 text-sm font-semibold">No invoices yet</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Invoices for this project will appear here.
          </p>
        </div>
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
            INVOICE_STATUS[invoice.status] ?? INVOICE_STATUS.DRAFT;

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
