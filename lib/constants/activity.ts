/**
 * Human-readable labels for `ActivityType` values, shared by the
 * freelancer dashboard (project timeline + recent-activity feed).
 *
 * Client-facing portal copy intentionally lives separately in the portal
 * page — it uses a different voice ("A deliverable was approved").
 */
export const ACTIVITY_LABELS: Record<string, string> = {
  PROJECT_CREATED: "Project created",
  PROJECT_STATUS_CHANGED: "Status changed",
  PROJECT_PROGRESS_UPDATED: "Progress updated",
  CLIENT_INVITED: "Client invited",
  DELIVERABLE_CREATED: "Deliverable created",
  DELIVERABLE_SUBMITTED: "Deliverable submitted for review",
  DELIVERABLE_VERSION_UPLOADED: "New version uploaded",
  DELIVERABLE_APPROVED: "Deliverable approved",
  CHANGES_REQUESTED: "Changes requested",
  COMMENT_ADDED: "Comment added",
  REQUEST_CREATED: "Request submitted",
  REQUEST_STATUS_CHANGED: "Request status changed",
  INVOICE_CREATED: "Invoice created",
  INVOICE_SENT: "Invoice sent",
  INVOICE_PAID: "Invoice paid",
};

/** Label for an activity type with a readable fallback for unknown values. */
export const activityLabel = (type: string): string =>
  ACTIVITY_LABELS[type] ?? type.replace(/_/g, " ").toLowerCase();
