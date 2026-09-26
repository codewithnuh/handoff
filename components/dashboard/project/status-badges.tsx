import { Badge } from "@/components/ui/badge";
import {
  PROJECT_STATUS_OPTIONS,
  DELIVERABLE_STATUS_OPTIONS,
  REQUEST_STATUS_CONFIG,
  INVOICE_STATUS_CONFIG,
} from "@/lib/presentational/status";

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
