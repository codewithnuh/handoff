"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import {
  FileCheck,
  MessageSquare,
  Receipt,
  Activity as ActivityIcon,
  ChevronRight,
  Calendar,
  FileText,
  Download,
  User,
  Trash2,
  Plus,
  Circle,
  Link2,
  Copy,
  Check,
  Send,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import { activityLabel } from "@/lib/constants/activity";
import type { ProjectDetailData } from "@/lib/queries/project";
import {
  createDeliverable,
  updateDeliverable,
  deleteDeliverable,
} from "@/lib/actions/deliverable";
import { updateProjectStatus, deleteProject } from "@/lib/actions/project";
import { updateRequestStatus } from "@/lib/actions/request";
import { inviteClient } from "@/lib/actions/invitation";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

type TabKey = "deliverables" | "requests" | "invoices" | "activity";

interface ProjectDetailProps {
  data: ProjectDetailData;
}

// ──────────────────────────────────────────────
// Status Config
// ──────────────────────────────────────────────

const PROJECT_STATUS_OPTIONS = [
  { value: "PLANNING", label: "Planning", variant: "secondary" as const },
  { value: "IN_PROGRESS", label: "In Progress", variant: "default" as const },
  { value: "COMPLETED", label: "Completed", variant: "outline" as const },
  { value: "CANCELLED", label: "Cancelled", variant: "destructive" as const },
];

const DELIVERABLE_STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft", variant: "secondary" as const },
  { value: "IN_REVIEW", label: "In Review", variant: "default" as const },
  {
    value: "CHANGES_REQUESTED",
    label: "Changes Requested",
    variant: "secondary" as const,
  },
  { value: "APPROVED", label: "Approved", variant: "outline" as const },
];

// ──────────────────────────────────────────────
// Status Badge Helpers
// ──────────────────────────────────────────────

function ProjectStatusBadge({ status }: { status: string }) {
  const config =
    PROJECT_STATUS_OPTIONS.find((s) => s.value === status) ??
    PROJECT_STATUS_OPTIONS[0];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function DeliverableStatusBadge({ status }: { status: string }) {
  const config =
    DELIVERABLE_STATUS_OPTIONS.find((s) => s.value === status) ??
    DELIVERABLE_STATUS_OPTIONS[0];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function RequestStatusBadge({ status }: { status: string }) {
  const config: Record<
    string,
    {
      label: string;
      variant: "default" | "secondary" | "outline" | "destructive";
    }
  > = {
    OPEN: { label: "Open", variant: "secondary" },
    IN_PROGRESS: { label: "In Progress", variant: "default" },
    COMPLETED: { label: "Completed", variant: "outline" },
  };
  const c = config[status] ?? config.OPEN;
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const config: Record<
    string,
    {
      label: string;
      variant: "default" | "secondary" | "outline" | "destructive";
    }
  > = {
    PAID: { label: "Paid", variant: "outline" },
    SENT: { label: "Sent", variant: "default" },
    OVERDUE: { label: "Overdue", variant: "destructive" },
    DRAFT: { label: "Draft", variant: "secondary" },
    CANCELLED: { label: "Cancelled", variant: "destructive" },
  };
  const c = config[status] ?? config.DRAFT;
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

// ──────────────────────────────────────────────
// Format Helpers
// ──────────────────────────────────────────────

function formatDate(date: Date | string | null): string {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatCurrency(amount: string, currency: string): string {
  const num = parseFloat(amount);
  if (isNaN(num)) return `${amount} ${currency}`;
  return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2 })} ${currency}`;
}

// ──────────────────────────────────────────────
// Create Deliverable Dialog
// ──────────────────────────────────────────────

function CreateDeliverableDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const form = useForm({
    defaultValues: {
      title: "",
      description: "",
    },
    onSubmit: async ({ value }) => {
      try {
        const result = await createDeliverable({
          projectId,
          title: value.title,
          description: value.description.trim() || null,
        });

        if (!result.success) {
          toast.add({
            type: "error",
            title: "Couldn't create deliverable",
            description: result.message,
          });
          return;
        }

        toast.add({
          type: "success",
          title: "Deliverable created",
          description: `"${result.data.title}" has been added.`,
        });

        form.reset();
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Add Deliverable
      </DialogTrigger>
      <DialogContent className="flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>Create Deliverable</DialogTitle>
          <DialogDescription>
            Add a new deliverable to track work for this project.
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
          <form.Field name="title">
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={field.name}>Title</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  required
                  aria-required
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="e.g. Logo Design Draft"
                />
                {field.state.meta.errors.length > 0 && (
                  <p role="alert" className="text-xs text-destructive">
                    {field.state.meta.errors.join(", ")}
                  </p>
                )}
              </div>
            )}
          </form.Field>

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
                  placeholder="Brief description of this deliverable"
                />
              </div>
            )}
          </form.Field>

          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
          >
            {([canSubmit, isSubmitting]) => (
              <Button type="submit" disabled={!canSubmit || isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Deliverable"}
              </Button>
            )}
          </form.Subscribe>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────
// Invite Client Dialog (with copy link)
// ──────────────────────────────────────────────

function InviteClientDialog({
  projectId,
  clientName,
  clientEmail,
}: {
  projectId: string;
  clientName: string;
  clientEmail: string;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(clientEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) return;
    setIsSubmitting(true);
    try {
      const result = await inviteClient({
        projectId,
        email: email.trim(),
      });

      if (!result.success) {
        toast.add({
          type: "error",
          title: "Couldn't create invitation",
          description: result.message,
        });
        return;
      }

      setInviteLink(result.data.acceptUrl);
      toast.add({
        type: "success",
        title: "Invitation created",
        description: "Copy the link and share it with your client.",
      });
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

  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.add({
        type: "success",
        title: "Link copied",
        description: "Paste it into a message to share with your client.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.add({
        type: "error",
        title: "Couldn't copy",
        description: "Please copy the link manually.",
      });
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setInviteLink(null);
      setCopied(false);
      setEmail(clientEmail);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <Send className="mr-1.5 h-3.5 w-3.5" />
        Invite
      </DialogTrigger>
      <DialogContent className="flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>Invite client to project</DialogTitle>
          <DialogDescription>
            Generate a portal link for {clientName}. Copy it and send it however
            you like.
          </DialogDescription>
        </DialogHeader>

        {inviteLink ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-md border bg-muted/50 p-3">
              <Link2 className="size-4 shrink-0 text-muted-foreground" />
              <p className="text-xs text-muted-foreground truncate flex-1 font-mono">
                {inviteLink}
              </p>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => handleCopyLink(inviteLink)}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="size-4 text-green-600" />
                ) : (
                  <Copy className="size-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              This link expires in 7 days. Share it via email, Slack, or any
              messaging app.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-email">Client email</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@example.com"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            {inviteLink ? "Done" : "Cancel"}
          </DialogClose>
          {!inviteLink && (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !email.trim()}
            >
              {isSubmitting ? "Creating..." : "Create Link"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────
// Delete Confirm Dialog
// ──────────────────────────────────────────────

function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  isDeleting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  isDeleting: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────
// Deliverable Card (with CRUD)
// ──────────────────────────────────────────────

function DeliverableCard({
  item,
}: {
  item: ProjectDetailData["deliverables"][number];
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const router = useRouter();

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === item.status) return;
    setIsUpdatingStatus(true);
    try {
      // Optimistic locking: reject the write if the client changed
      // this deliverable (version bumped) since we loaded the page.
      const result = await updateDeliverable({
        id: item.id,
        status: newStatus as
          | "DRAFT"
          | "IN_REVIEW"
          | "CHANGES_REQUESTED"
          | "APPROVED",
        expectedVersion: item.version,
      });
      if (!result.success) {
        toast.add({
          type: "error",
          title:
            result.error.code === "CONFLICT"
              ? "Outdated view"
              : "Update failed",
          description:
            result.error.code === "CONFLICT"
              ? "This deliverable was changed by your client. Refreshing…"
              : result.message,
        });
      } else {
        toast.add({
          type: "success",
          title: "Status updated",
          description: `Deliverable marked as ${newStatus.replace(/_/g, " ").toLowerCase()}.`,
        });
      }
    } catch {
      toast.add({
        type: "error",
        title: "Something went wrong",
        description: "Please try again.",
      });
    } finally {
      setIsUpdatingStatus(false);
      router.refresh();
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteDeliverable({ id: item.id });
      if (!result.success) {
        toast.add({
          type: "error",
          title: "Delete failed",
          description: result.message,
        });
      } else {
        toast.add({
          type: "success",
          title: "Deliverable deleted",
          description: "The deliverable has been removed.",
        });
        setDeleteOpen(false);
      }
    } catch {
      toast.add({
        type: "error",
        title: "Something went wrong",
        description: "Please try again.",
      });
    } finally {
      setIsDeleting(false);
      router.refresh();
    }
  };

  return (
    <>
      <Card className="shadow-xs">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{item.title}</h3>
                <DeliverableStatusBadge status={item.status} />
              </div>
              {item.description && (
                <p className="text-xs text-muted-foreground mt-1">
                  {item.description}
                </p>
              )}
            </div>

            {/* Deliverable Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="ghost" size="icon-sm" />}
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                >
                  <circle cx="8" cy="3" r="1.5" />
                  <circle cx="8" cy="8" r="1.5" />
                  <circle cx="8" cy="13" r="1.5" />
                </svg>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => handleStatusChange("IN_REVIEW")}
                  disabled={isUpdatingStatus || item.status === "IN_REVIEW"}
                >
                  <Circle className="h-3.5 w-3.5" />
                  Submit for Review
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleStatusChange("DRAFT")}
                  disabled={isUpdatingStatus || item.status === "DRAFT"}
                >
                  <Circle className="h-3.5 w-3.5" />
                  Mark as Draft
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Deliverable
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Versions & Files */}
          <div className="bg-muted/50 rounded-md p-3 border border-border space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-foreground">
                Versions & Files
              </span>
              <span>Updated {formatDate(item.updatedAt)}</span>
            </div>

            {item.versions.length > 0 ? (
              <div className="space-y-2">
                {item.versions.map((ver) => (
                  <div
                    key={ver.id}
                    className="flex items-center justify-between bg-background p-2.5 rounded border border-border text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <div>
                        <span className="font-medium">
                          v{ver.versionNumber} -{" "}
                          {ver.file?.filename ?? "No file"}
                        </span>
                        {ver.notes && (
                          <p className="text-[11px] text-muted-foreground">
                            {ver.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    {ver.file && (
                      <Button variant="ghost" size="icon-sm">
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                No files uploaded yet.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        title="Delete Deliverable"
        description={`Are you sure you want to delete "${item.title}"? This action cannot be undone.`}
        isDeleting={isDeleting}
      />
    </>
  );
}

// ──────────────────────────────────────────────
// Tab Content Components
// ──────────────────────────────────────────────

function DeliverablesTab({
  deliverables,
  projectId,
}: {
  deliverables: ProjectDetailData["deliverables"];
  projectId: string;
}) {
  if (deliverables.length === 0) {
    return (
      <div className="rounded-lg space-y-4 border border-dashed border-muted-foreground/25 bg-muted/25 p-12 text-center">
        <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted">
          <FileCheck className="size-5 text-muted-foreground" />
        </div>
        <h3 className="mt-3 text-sm font-semibold">No deliverables yet</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Create your first deliverable to start tracking work.
        </p>
        <CreateDeliverableDialog projectId={projectId} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CreateDeliverableDialog projectId={projectId} />
      </div>
      <div className="grid grid-cols-1 gap-4">
        {deliverables.map((item) => (
          <DeliverableCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

function RequestsTab({
  requests,
}: {
  requests: ProjectDetailData["requests"];
}) {
  const router = useRouter();

  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleStatusChange = async (requestId: string, newStatus: string) => {
    const req = requests.find((r) => r.id === requestId);
    if (!req || req.status === newStatus) return;
    setUpdatingId(requestId);
    try {
      const result = await updateRequestStatus({
        id: requestId,
        status: newStatus as "OPEN" | "IN_PROGRESS" | "COMPLETED",
      });
      if (!result.success) {
        toast.add({
          type: "error",
          title: "Update failed",
          description: result.message,
        });
      } else {
        toast.add({
          type: "success",
          title: "Status updated",
          description: `Request marked as ${newStatus.replace(/_/g, " ").toLowerCase()}.`,
        });
      }
    } catch {
      toast.add({
        type: "error",
        title: "Something went wrong",
        description: "Please try again.",
      });
    } finally {
      setUpdatingId(null);
      router.refresh();
    }
  };

  if (requests.length === 0) {
    return (
      <EmptyTab
        icon={<MessageSquare className="size-5 text-muted-foreground" />}
        title="No client requests"
        description="Client work requests will appear here."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      {requests.map((req) => (
        <Card key={req.id} className="shadow-xs">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{req.title}</span>
                <RequestStatusBadge status={req.status} />
              </div>
              {req.description && (
                <p className="text-xs text-muted-foreground">
                  {req.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right text-xs text-muted-foreground">
                <span>Submitted {formatDate(req.createdAt)}</span>
              </div>
              <Select
                value={req.status}
                onValueChange={(val) => {
                  if (val) handleStatusChange(req.id, val);
                }}
                disabled={updatingId === req.id}
              >
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function InvoicesTab({
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

function ActivityTab({
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

// ──────────────────────────────────────────────
// Empty Tab State
// ──────────────────────────────────────────────

function EmptyTab({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg space-y-4 border border-dashed border-muted-foreground/25 bg-muted/25 p-12 text-center">
      <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted">
        {icon}
      </div>
      <h3 className="mt-3 text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

// ──────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────

export function ProjectDetail({ data }: ProjectDetailProps) {
  const { project, deliverables, requests, invoices, activities } = data;
  const [activeTab, setActiveTab] = useState<TabKey>("deliverables");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const router = useRouter();

  const handleProjectStatusChange = async (newStatus: string) => {
    if (newStatus === project.status) return;
    setIsUpdatingStatus(true);
    try {
      const result = await updateProjectStatus({
        id: project.id,
        status: newStatus as
          | "PLANNING"
          | "IN_PROGRESS"
          | "COMPLETED"
          | "CANCELLED",
      });
      if (!result.success) {
        toast.add({
          type: "error",
          title: "Update failed",
          description: result.message,
        });
      } else {
        toast.add({
          type: "success",
          title: "Status updated",
          description: `Project marked as ${newStatus.replace(/_/g, " ").toLowerCase()}.`,
        });
      }
    } catch {
      toast.add({
        type: "error",
        title: "Something went wrong",
        description: "Please try again.",
      });
    } finally {
      setIsUpdatingStatus(false);
      router.refresh();
    }
  };

  const handleDeleteProject = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteProject({ id: project.id });
      if (!result.success) {
        toast.add({
          type: "error",
          title: "Delete failed",
          description: result.message,
        });
      } else {
        toast.add({
          type: "success",
          title: "Project deleted",
          description: "The project has been removed.",
        });
        router.push("/dashboard/projects");
      }
    } catch {
      toast.add({
        type: "error",
        title: "Something went wrong",
        description: "Please try again.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const tabs: {
    key: TabKey;
    label: string;
    icon: React.ReactNode;
    count: number;
  }[] = [
    {
      key: "deliverables",
      label: "Deliverables",
      icon: <FileCheck className="h-4 w-4" />,
      count: deliverables.length,
    },
    {
      key: "requests",
      label: "Client Requests",
      icon: <MessageSquare className="h-4 w-4" />,
      count: requests.length,
    },
    {
      key: "invoices",
      label: "Invoices",
      icon: <Receipt className="h-4 w-4" />,
      count: invoices.length,
    },
    {
      key: "activity",
      label: "Activity Log",
      icon: <ActivityIcon className="h-4 w-4" />,
      count: activities.length,
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl">
      {/* Navigation Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link
          href="/dashboard/projects"
          className="hover:text-foreground transition-colors"
        >
          Projects
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="font-medium text-foreground">{project.name}</span>
      </nav>

      {/* Project Header Card */}
      <Card className="shadow-xs">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">
                  {project.name}
                </h1>
                <ProjectStatusBadge status={project.status} />
              </div>
              {project.description && (
                <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
                  {project.description}
                </p>
              )}
            </div>

            {/* Project Actions */}
            <div className="flex items-center gap-2">
              {/* Status Change Select */}
              <Select
                value={project.status}
                onValueChange={(val) => {
                  if (val) handleProjectStatusChange(val);
                }}
                disabled={isUpdatingStatus}
              >
                <SelectTrigger className="w-[140px] h-8">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {PROJECT_STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              {/* Invite Client Button */}
              <InviteClientDialog
                projectId={project.id}
                clientName={project.client.name}
                clientEmail={project.client.email}
              />

              {/* Delete Project Button */}
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Project Meta Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border text-xs">
            <div>
              <span className="text-muted-foreground block mb-1">Client</span>
              <span className="font-medium flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                {project.client.company || project.client.name}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block mb-1">Due Date</span>
              <span className="font-medium flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(project.dueDate)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block mb-1">Progress</span>
              <div className="flex items-center gap-2">
                <div className="w-24 bg-muted rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-primary h-1.5 rounded-full"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
                <span className="font-medium">{project.progress}%</span>
              </div>
            </div>
            <div>
              <span className="text-muted-foreground block mb-1">
                Deliverables
              </span>
              <span className="font-medium">{deliverables.length} Total</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <div className="border-b border-border">
        <nav className="-mb-px flex space-x-6 text-sm font-medium">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 border-b-2 inline-flex items-center gap-2 transition-colors ${
                activeTab === tab.key
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              {tab.icon}
              {tab.label} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "deliverables" && (
        <DeliverablesTab deliverables={deliverables} projectId={project.id} />
      )}
      {activeTab === "requests" && <RequestsTab requests={requests} />}
      {activeTab === "invoices" && <InvoicesTab invoices={invoices} />}
      {activeTab === "activity" && <ActivityTab activities={activities} />}

      {/* Delete Project Confirm Dialog */}
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDeleteProject}
        title="Delete Project"
        description={`Are you sure you want to delete "${project.name}"? This will also delete all deliverables, requests, invoices, and activity. This action cannot be undone.`}
        isDeleting={isDeleting}
      />
    </div>
  );
}
