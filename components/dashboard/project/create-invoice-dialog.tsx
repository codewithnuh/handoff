"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { Plus, FileCheck } from "lucide-react";

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
import { toast } from "@/components/ui/toast";
import { createInvoice, convertDeliverablesToLineItems } from "@/lib/actions/invoice";

interface CreateInvoiceDialogProps {
  projectId: string;
  approvedDeliverables: {
    id: string;
    title: string;
    description: string | null;
  }[];
}

export function CreateInvoiceDialog({
  projectId,
  approvedDeliverables,
}: CreateInvoiceDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedDeliverables, setSelectedDeliverables] = useState<Set<string>>(
    new Set(),
  );
  const router = useRouter();

  const form = useForm({
    defaultValues: {
      description: "",
      dueDate: "",
      taxRate: "0",
      paymentNotes: "",
    },
    onSubmit: async ({ value }) => {
      try {
        // 1. Create the invoice
        const result = await createInvoice({
          projectId,
          description: value.description.trim() || null,
          dueDate: value.dueDate ? new Date(value.dueDate) : null,
          taxRate: parseFloat(value.taxRate) || 0,
          paymentNotes: value.paymentNotes.trim() || null,
        });

        if (!result.success) {
          toast.add({
            type: "error",
            title: "Couldn't create invoice",
            description: result.message,
          });
          return;
        }

        // 2. Convert selected deliverables to line items
        if (selectedDeliverables.size > 0) {
          const convertResult = await convertDeliverablesToLineItems({
            projectId,
            invoiceId: result.data.id,
            deliverableIds: Array.from(selectedDeliverables),
          });

          if (!convertResult.success) {
            toast.add({
              type: "warning",
              title: "Invoice created",
              description: `Invoice created but: ${convertResult.message}`,
            });
          }
        }

        toast.add({
          type: "success",
          title: "Invoice created",
          description: `Invoice ${result.data.invoiceNumber} has been created.`,
        });

        form.reset();
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
      }
    },
  });

  const toggleDeliverable = (id: string) => {
    setSelectedDeliverables((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Create Invoice
      </DialogTrigger>
      <DialogContent className="flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
          <DialogDescription>
            Create a new invoice for this project. You can add line items after
            creation.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="flex flex-col gap-4 mt-2"
        >
          <form.Field name="description">
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={field.name}>Description (optional)</Label>
                <Textarea
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Invoice for Q1 design work"
                />
              </div>
            )}
          </form.Field>

          <div className="grid grid-cols-2 gap-4">
            <form.Field name="dueDate">
              {(field) => (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={field.name}>Due Date (optional)</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="date"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="taxRate">
              {(field) => (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={field.name}>Tax Rate (%)</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="0"
                  />
                </div>
              )}
            </form.Field>
          </div>

          <form.Field name="paymentNotes">
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={field.name}>Payment Notes (optional)</Label>
                <Textarea
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Bank transfer details, payment terms, etc."
                  rows={3}
                />
              </div>
            )}
          </form.Field>

          {/* Approved Deliverables to Convert */}
          {approvedDeliverables.length > 0 && (
            <div className="flex flex-col gap-2">
              <Label>Convert Approved Deliverables to Line Items</Label>
              <p className="text-xs text-muted-foreground">
                Select approved deliverables to automatically add as line items
                (with $0 price — update prices after creation).
              </p>
              <div className="space-y-2 max-h-40 overflow-y-auto border border-border rounded-md p-3">
                {approvedDeliverables.map((d) => (
                  <label
                    key={d.id}
                    className="flex items-start gap-2 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedDeliverables.has(d.id)}
                      onCheckedChange={() => toggleDeliverable(d.id)}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{d.title}</p>
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

          {approvedDeliverables.length === 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md p-3">
              <FileCheck className="h-4 w-4 shrink-0" />
              <span>
                No approved deliverables to convert. Create the invoice first,
                then add line items manually.
              </span>
            </div>
          )}

          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
          >
            {([canSubmit, isSubmitting]) => (
              <Button type="submit" disabled={!canSubmit || isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Invoice"}
              </Button>
            )}
          </form.Subscribe>
        </form>
      </DialogContent>
    </Dialog>
  );
}
