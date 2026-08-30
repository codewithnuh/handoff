"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Calculator } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import {
  createInvoice,
  convertDeliverablesToLineItems,
} from "@/lib/actions/invoice";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

type LineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
};

type ClientOption = {
  id: string;
  name: string;
  email: string;
  company: string | null;
};

interface CreateInvoiceDialogProps {
  projectId: string;
  /** The project's client — used to autofill bill-to details */
  projectClient: ClientOption | null;
  /** The logged-in user's profile — used to autofill from-details */
  userProfile: {
    name: string;
    email: string;
  };
  approvedDeliverables: {
    id: string;
    title: string;
    description: string | null;
  }[];
}

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF", "INR"];

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export function CreateInvoiceDialog({
  projectId,
  projectClient,
  userProfile,
  approvedDeliverables,
}: CreateInvoiceDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedDeliverables, setSelectedDeliverables] = useState<Set<string>>(
    new Set(),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // Form state
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [taxRate, setTaxRate] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [currency, setCurrency] = useState("USD");
  const [paymentNotes, setPaymentNotes] = useState("");

  // Line items
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unitPrice: 0 },
  ]);

  // ── Calculated totals ──
  const totals = useMemo(() => {
    const subtotal = lineItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );
    const discountNum = parseFloat(discount) || 0;
    const taxableAmount = Math.max(0, subtotal - discountNum);
    const taxRateNum = parseFloat(taxRate) || 0;
    const taxAmount = taxableAmount * (taxRateNum / 100);
    const total = taxableAmount + taxAmount;
    return { subtotal, discountNum, taxAmount, total };
  }, [lineItems, taxRate, discount]);

  const formatMoney = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);

  // ── Line item helpers ──
  const addLineItem = () =>
    setLineItems((prev) => [
      ...prev,
      { description: "", quantity: 1, unitPrice: 0 },
    ]);

  const removeLineItem = (index: number) =>
    setLineItems((prev) => prev.filter((_, i) => i !== index));

  const updateLineItem = (
    index: number,
    field: keyof LineItem,
    value: string | number,
  ) =>
    setLineItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    );

  // ── Deliverable toggle ──
  const toggleDeliverable = (id: string, title: string) => {
    setSelectedDeliverables((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        // Remove the corresponding line item
        setLineItems((items) =>
          items.filter((item) => item.description !== title),
        );
      } else {
        next.add(id);
        // Add as a line item
        setLineItems((items) => [
          ...items.filter((item) => item.description !== title),
          { description: title, quantity: 1, unitPrice: 0 },
        ]);
      }
      return next;
    });
  };

  // ── Submit ──
  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (totals.total <= 0) {
      toast.add({
        type: "error",
        title: "Invoice total is $0.00",
        description: "Add line items with prices before creating the invoice.",
      });
      return;
    }

    const validLineItems = lineItems.filter(
      (item) => item.description.trim() && item.unitPrice > 0,
    );
    if (validLineItems.length === 0) {
      toast.add({
        type: "error",
        title: "No valid line items",
        description:
          "Each line item needs a description and a price greater than $0.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createInvoice({
        projectId,
        description: description.trim() || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        taxRate: parseFloat(taxRate) || 0,
        discount: parseFloat(discount) || 0,
        currency,
        paymentNotes: paymentNotes.trim() || null,
        lineItems: validLineItems,
      });

      if (!result.success) {
        toast.add({
          type: "error",
          title: "Couldn't create invoice",
          description: result.message,
        });
        return;
      }

      // Convert selected deliverables (if any weren't already added as line items)
      if (selectedDeliverables.size > 0) {
        await convertDeliverablesToLineItems({
          projectId,
          invoiceId: result.data.id,
          deliverableIds: Array.from(selectedDeliverables),
        });
      }

      toast.add({
        type: "success",
        title: "Invoice created",
        description: `Invoice ${result.data.invoiceNumber} has been created.`,
      });

      // Reset
      setDescription("");
      setDueDate("");
      setTaxRate("0");
      setDiscount("0");
      setCurrency("USD");
      setPaymentNotes("");
      setLineItems([{ description: "", quantity: 1, unitPrice: 0 }]);
      setSelectedDeliverables(new Set());
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.add({
        type: "error",
        title: "Something went wrong",
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Create Invoice
      </DialogTrigger>
      <DialogContent className="flex flex-col gap-4 max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
          <DialogDescription>
            Fill in the details below. Line items are required.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 mt-2">
          {/* ── Description ── */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="inv-desc">Description (optional)</Label>
            <Textarea
              id="inv-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Invoice for Q1 design work"
            />
          </div>

          {/* ── Dates, Tax, Discount, Currency ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inv-due">Due Date</Label>
              <Input
                id="inv-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inv-currency">Currency</Label>
              <Select value={currency} onValueChange={(v) => v && setCurrency(v)}>
                <SelectTrigger id="inv-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inv-tax">Tax Rate (%)</Label>
              <Input
                id="inv-tax"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inv-discount">Discount</Label>
              <Input
                id="inv-discount"
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          {/* ── Sender Details ── */}
          <div className="rounded-md border border-border p-3 space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">
              From
            </Label>
            <p className="text-sm">
              {userProfile.name} &middot; {userProfile.email}
            </p>
          </div>

          {/* ── Client Details ── */}
          {projectClient && (
            <div className="rounded-md border border-border p-3 space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                Bill To
              </Label>
              <p className="text-sm">
                {projectClient.company || projectClient.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {projectClient.email}
              </p>
            </div>
          )}

          {/* ── Line Items ── */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Line Items</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addLineItem}
                className="h-7 text-xs"
              >
                <Plus className="mr-1 h-3 w-3" />
                Add item
              </Button>
            </div>

            <div className="space-y-2">
              {lineItems.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[1fr_80px_100px_32px] gap-2 items-end"
                >
                  <div className="flex flex-col gap-1">
                    {index === 0 && (
                      <Label className="text-xs text-muted-foreground">
                        Description
                      </Label>
                    )}
                    <Input
                      value={item.description}
                      onChange={(e) =>
                        updateLineItem(index, "description", e.target.value)
                      }
                      placeholder="Service or deliverable"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    {index === 0 && (
                      <Label className="text-xs text-muted-foreground">
                        Qty
                      </Label>
                    )}
                    <Input
                      type="number"
                      min="0.01"
                      step="0.5"
                      value={item.quantity}
                      onChange={(e) =>
                        updateLineItem(
                          index,
                          "quantity",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    {index === 0 && (
                      <Label className="text-xs text-muted-foreground">
                        Unit Price
                      </Label>
                    )}
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice || ""}
                      onChange={(e) =>
                        updateLineItem(
                          index,
                          "unitPrice",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeLineItem(index)}
                    disabled={lineItems.length === 1}
                    className="h-8 w-8"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* ── Approved Deliverables ── */}
          {approvedDeliverables.length > 0 && (
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-medium text-muted-foreground">
                Or convert approved deliverables
              </Label>
              <div className="space-y-1.5 max-h-32 overflow-y-auto border border-border rounded-md p-3">
                {approvedDeliverables.map((d) => (
                  <label
                    key={d.id}
                    className="flex items-start gap-2 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedDeliverables.has(d.id)}
                      onCheckedChange={() => toggleDeliverable(d.id, d.title)}
                    />
                    <div className="min-w-0">
                      <p className="text-sm">{d.title}</p>
                      {d.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {d.description}
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* ── Totals Summary ── */}
          <div className="rounded-md bg-muted/50 border border-border p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Calculator className="h-4 w-4" />
              Summary
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatMoney(totals.subtotal)}</span>
              </div>
              {totals.discountNum > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-{formatMoney(totals.discountNum)}</span>
                </div>
              )}
              {totals.taxAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Tax ({parseFloat(taxRate) || 0}%)
                  </span>
                  <span>{formatMoney(totals.taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold border-t border-border pt-1 mt-1">
                <span>Total</span>
                <span>{formatMoney(totals.total)}</span>
              </div>
            </div>
          </div>

          {/* ── Payment Notes ── */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="inv-notes">Payment Notes (optional)</Label>
            <Textarea
              id="inv-notes"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              placeholder="Bank transfer details, IBAN, SWIFT, PayPal, payment terms..."
              rows={3}
            />
          </div>

          {/* ── Submit ── */}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || totals.total <= 0}
          >
            {isSubmitting ? "Creating..." : "Create Invoice"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
