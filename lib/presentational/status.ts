export type StatusVariant =
  | "default"
  | "secondary"
  | "outline"
  | "destructive";

export type StatusOption = {
  value: string;
  label: string;
  variant: StatusVariant;
};

export type StatusConfig = Record<
  string,
  { label: string; variant: StatusVariant }
>;

export const PROJECT_STATUS_OPTIONS: StatusOption[] = [
  { value: "PLANNING", label: "Planning", variant: "secondary" },
  { value: "IN_PROGRESS", label: "In Progress", variant: "default" },
  { value: "COMPLETED", label: "Completed", variant: "outline" },
  { value: "CANCELLED", label: "Cancelled", variant: "destructive" },
];

export const DELIVERABLE_STATUS_OPTIONS: StatusOption[] = [
  { value: "DRAFT", label: "Draft", variant: "secondary" },
  { value: "IN_REVIEW", label: "In Review", variant: "default" },
  { value: "CHANGES_REQUESTED", label: "Changes Requested", variant: "secondary" },
  { value: "APPROVED", label: "Approved", variant: "outline" },
];

export const REQUEST_STATUS_CONFIG: StatusConfig = {
  OPEN: { label: "Open", variant: "secondary" },
  IN_PROGRESS: { label: "In Progress", variant: "default" },
  COMPLETED: { label: "Completed", variant: "outline" },
};

export const INVOICE_STATUS_CONFIG: StatusConfig = {
  PAID: { label: "Paid", variant: "outline" },
  SENT: { label: "Sent", variant: "default" },
  OVERDUE: { label: "Overdue", variant: "destructive" },
  DRAFT: { label: "Draft", variant: "secondary" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
};

/**
 * The client portal deliberately shows SENT invoices as "Pending" — a
 * customer-facing wording choice. Keep the divergence explicit instead of
 * silently diverging copies.
 */
export const INVOICE_STATUS_CONFIG_PORTAL: StatusConfig = {
  ...INVOICE_STATUS_CONFIG,
  SENT: { label: "Pending", variant: "default" },
};

export const LINK_STATUS_CONFIG: StatusConfig = {
  ACTIVE: { label: "Active", variant: "default" },
  EXPIRED: { label: "Expired", variant: "secondary" },
  ACCEPTED: { label: "Accepted", variant: "outline" },
  REVOKED: { label: "Revoked", variant: "destructive" },
};

export const TEAM_INVITE_STATUS_CONFIG: StatusConfig = {
  ACCEPTED: { label: "Accepted ✓", variant: "outline" },
  PENDING: { label: "Pending", variant: "secondary" },
};

export function teamInviteStatus(status: string): {
  label: string;
  variant: StatusVariant;
} {
  return (
    TEAM_INVITE_STATUS_CONFIG[status] ?? {
      label: "Expired",
      variant: "destructive",
    }
  );
}

export const ROLE_BADGE: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  OWNER: { label: "Owner", variant: "outline" },
  ADMIN: { label: "Admin", variant: "default" },
  MEMBER: { label: "Member", variant: "secondary" },
};

export const PROJECT_ROLE_LABEL: Record<string, string> = {
  LEAD: "Lead",
  CONTRIBUTOR: "Contributor",
  OBSERVER: "Observer",
};

export function projectStatusOption(status: string): StatusOption | undefined {
  return PROJECT_STATUS_OPTIONS.find((option) => option.value === status);
}

export function deliverableStatusOption(status: string): StatusOption | undefined {
  return DELIVERABLE_STATUS_OPTIONS.find((option) => option.value === status);
}
