import { Badge } from "@/components/ui/badge";

export const PROJECT_STATUS_OPTIONS = [
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

const REQUEST_STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  OPEN: { label: "Open", variant: "secondary" },
  IN_PROGRESS: { label: "In Progress", variant: "default" },
  COMPLETED: { label: "Completed", variant: "outline" },
};

const INVOICE_STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  PAID: { label: "Paid", variant: "outline" },
  SENT: { label: "Sent", variant: "default" },
  OVERDUE: { label: "Overdue", variant: "destructive" },
  DRAFT: { label: "Draft", variant: "secondary" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
};

export function ProjectStatusBadge({ status }: { status: string }) {
  const config =
    PROJECT_STATUS_OPTIONS.find((s) => s.value === status) ??
    PROJECT_STATUS_OPTIONS[0];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function DeliverableStatusBadge({ status }: { status: string }) {
  const config =
    DELIVERABLE_STATUS_OPTIONS.find((s) => s.value === status) ??
    DELIVERABLE_STATUS_OPTIONS[0];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function RequestStatusBadge({ status }: { status: string }) {
  const c = REQUEST_STATUS_CONFIG[status] ?? REQUEST_STATUS_CONFIG.OPEN;
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

export function InvoiceStatusBadge({ status }: { status: string }) {
  const c = INVOICE_STATUS_CONFIG[status] ?? INVOICE_STATUS_CONFIG.DRAFT;
  return <Badge variant={c.variant}>{c.label}</Badge>;
}
