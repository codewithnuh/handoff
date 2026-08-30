"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, DollarSign, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/toast";
import {
  updateInvoice,
  addLineItem,
  removeLineItem,
} from "@/lib/actions/invoice";
import { InvoiceStatusBadge } from "./status-badges";
import { formatDate, formatCurrency } from "./format";

type InvoiceWithLineItems = {
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
    id: string;
    description: string;
    quantity: number;
    unitPrice: string;
    amount: string;
    deliverableId: string | null;
  }[];
};

interface InvoiceDetailDialogProps {
  invoice: InvoiceWithLineItems;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoiceDetailDialog({
  invoice,
  open,
  onOpenChange,
}: InvoiceDetailDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState(invoice.description ?? "");
  const [dueDate, setDueDate] = useState(
    invoice.dueDate
      ? new Date(invoice.dueDate).toISOString().split("T")[0]
      : "",
  );
  const [taxRate, setTaxRate] = useState(invoice.taxRate);
  const [paymentNotes, setPaymentNotes] = useState(
    invoice.paymentNotes ?? "",
  );

  // Line item form
  const [showAddLineItem, setShowAddLineItem] = useState(false);
  const [lineDescription, setLineDescription] = useState("");
  const [lineQuantity, setLineQuantity] = useState("1");
  const [lineUnitPrice, setLineUnitPrice] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const isDraft = invoice.status === "DRAFT";

  const handleSaveDetails = async () => {
    setIsSaving(true);
    try {
      const result = await updateInvoice({
        id: invoice.id,
        description: description.trim() || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        taxRate: parseFloat(taxRate) || 0,
        paymentNotes: paymentNotes.trim() || null,
      });

      if (!result.success) {
        toast.add({
          type: "error",
          title: "Update failed",
          description: result.message,
        });
        return;
      }

      toast.add({ type: "success", title: "Invoice updated" });
      setIsEditing(false);
      router.refresh();
    } catch {
      toast.add({
        type: "error",
        title: "Something went wrong",
        description: "Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddLineItem = async () => {
    if (!lineDescription.trim() || !lineUnitPrice) return;

    setIsSaving(true);
    try {
      const result = await addLineItem({
        invoiceId: invoice.id,
        description: lineDescription.trim(),
        quantity: parseInt(lineQuantity) || 1,
        unitPrice: lineUnitPrice,
      });

      if (!result.success) {
        toast.add({
          type: "error",
          title: "Failed to add line item",
          description: result.message,
        });
        return;
      }

      toast.add({ type: "success", title: "Line item added" });
      setLineDescription("");
      setLineQuantity("1");
      setLineUnitPrice("");
      setShowAddLineItem(false);
      router.refresh();
    } catch {
      toast.add({
        type: "error",
        title: "Something went wrong",
        description: "Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveLineItem = async (lineItemId: string) => {
    setIsSaving(true);
    try {
      const result = await removeLineItem({ id: lineItemId });
      if (!result.success) {
        toast.add({
          type: "error",
          title: "Failed to remove line item",
          description: result.message,
        });
        return;
      }
      toast.add({ type: "success", title: "Line item removed" });
      router.refresh();
    } catch {
      toast.add({
        type: "error",
        title: "Something went wrong",
        description: "Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col gap-4 max-h-[85vh] overflow-y-auto max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                {invoice.invoiceNumber}
                <InvoiceStatusBadge status={invoice.status} />
              </DialogTitle>
              <DialogDescription>
                Created {formatDate(invoice.createdAt)}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
              >
                <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noopener noreferrer" className="flex items-center">
                  <Download className="mr-1 h-3.5 w-3.5" />
                  PDF
                </a>
              </Button>
              {isDraft && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? "Cancel Edit" : "Edit Details"}
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Invoice Details */}
        <div className="space-y-4">
          {isEditing ? (
            <>
              <div className="flex flex-col gap-1.5">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Invoice description"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Tax Rate (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Payment Notes</Label>
                <Textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Bank details, payment terms..."
                  rows={3}
                />
              </div>
              <Button onClick={handleSaveDetails} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground">Description</span>
                <p className="font-medium">{invoice.description || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Due Date</span>
                <p className="font-medium">{formatDate(invoice.dueDate)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Tax Rate</span>
                <p className="font-medium">{invoice.taxRate}%</p>
              </div>
              {invoice.paidAt && (
                <div>
                  <span className="text-muted-foreground">Paid At</span>
                  <p className="font-medium">{formatDate(invoice.paidAt)}</p>
                </div>
              )}
              {invoice.paymentNotes && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Payment Notes</span>
                  <p className="font-medium whitespace-pre-wrap">
                    {invoice.paymentNotes}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* Line Items */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Line Items</h3>
            {isDraft && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddLineItem(!showAddLineItem)}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add Item
              </Button>
            )}
          </div>

          {invoice.lineItems.length > 0 ? (
            <div className="border border-border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="p-2">Description</TableHead>
                    <TableHead className="p-2 w-16">Qty</TableHead>
                    <TableHead className="p-2 w-24">Unit Price</TableHead>
                    <TableHead className="p-2 w-24">Amount</TableHead>
                    {isDraft && <TableHead className="p-2 w-10" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.lineItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="p-2 text-xs">
                        {item.description}
                      </TableCell>
                      <TableCell className="p-2 text-xs">{item.quantity}</TableCell>
                      <TableCell className="p-2 text-xs">
                        {formatCurrency(item.unitPrice, invoice.currency)}
                      </TableCell>
                      <TableCell className="p-2 text-xs font-medium">
                        {formatCurrency(item.amount, invoice.currency)}
                      </TableCell>
                      {isDraft && (
                        <TableCell className="p-2">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleRemoveLineItem(item.id)}
                            disabled={isSaving}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-6 text-xs text-muted-foreground border border-dashed border-muted-foreground/25 rounded-md">
              No line items yet. Add one below.
            </div>
          )}

          {/* Add Line Item Form */}
          {showAddLineItem && isDraft && (
            <div className="border border-border rounded-md p-3 space-y-3">
              <div className="flex flex-col gap-1.5">
                <Label>Description</Label>
                <Input
                  value={lineDescription}
                  onChange={(e) => setLineDescription(e.target.value)}
                  placeholder="e.g. Homepage Design"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={lineQuantity}
                    onChange={(e) => setLineQuantity(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Unit Price</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={lineUnitPrice}
                    onChange={(e) => setLineUnitPrice(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleAddLineItem}
                  disabled={!lineDescription.trim() || !lineUnitPrice || isSaving}
                >
                  {isSaving ? "Adding..." : "Add Line Item"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowAddLineItem(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        <Separator />

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
              <span className="flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5" />
                {formatCurrency(invoice.amount, invoice.currency)}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
