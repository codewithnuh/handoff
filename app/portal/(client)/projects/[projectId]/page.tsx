import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireClientSession } from "@/lib/portal";
import { getPortalProjectDetail } from "@/lib/queries/project";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  Calendar,
  User,
  FileCheck,
  FileText,
  Download,
  Activity as ActivityIcon,
  CheckCircle2,
  Circle,
  CircleDashed,
} from "lucide-react";
import { DeliverableActions } from "@/components/portal/deliverable-actions";
import { CommentSection } from "@/components/portal/comment-section";
import { RequestSection } from "@/components/portal/request-section";
import { PortalInvoiceSection } from "@/components/portal/invoice-detail";

// ──────────────────────────────────────────────
// Status Config
// ──────────────────────────────────────────────

const PROJECT_STATUS: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "outline" | "destructive";
  }
> = {
  PLANNING: { label: "Planning", variant: "secondary" },
  IN_PROGRESS: { label: "In Progress", variant: "default" },
  COMPLETED: { label: "Completed", variant: "outline" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
};

const DELIVERABLE_STATUS: Record<
  string,
  { label: string; icon: typeof Circle }
> = {
  DRAFT: { label: "Draft", icon: Circle },
  IN_REVIEW: { label: "In Review", icon: CircleDashed },
  CHANGES_REQUESTED: { label: "Changes Requested", icon: Circle },
  APPROVED: { label: "Approved", icon: CheckCircle2 },
};

const ACTIVITY_LABELS: Record<string, string> = {
  PROJECT_CREATED: "Project was created",
  PROJECT_STATUS_CHANGED: "Project status was updated",
  PROJECT_PROGRESS_UPDATED: "Progress was updated",
  DELIVERABLE_CREATED: "A deliverable was added",
  DELIVERABLE_SUBMITTED: "A deliverable was submitted for review",
  DELIVERABLE_VERSION_UPLOADED: "A new version was uploaded",
  DELIVERABLE_APPROVED: "A deliverable was approved",
  CHANGES_REQUESTED: "Changes were requested on a deliverable",
  REQUEST_CREATED: "A request was submitted",
  REQUEST_STATUS_CHANGED: "Request status was updated",
  INVOICE_CREATED: "An invoice was created",
  INVOICE_SENT: "An invoice was sent",
  INVOICE_PAID: "An invoice was marked as paid",
  CLIENT_INVITED: "You were invited to this project",
  COMMENT_ADDED: "A comment was added",
};

// ──────────────────────────────────────────────
// Format Helpers
// ──────────────────────────────────────────────

function formatDate(date: Date | null): string {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(date: Date): string {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ──────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────

export default async function PortalProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  // 1. Require valid client session
  const session = await requireClientSession();
  if (!session.ok) {
    redirect("/portal/expired");
  }

  // 2. Fetch project data (includes access check)
  const data = await getPortalProjectDetail(projectId, session.email);
  if (!data) notFound();

  const { project, deliverables, requests, invoices, activities } = data;
  const statusConfig =
    PROJECT_STATUS[project.status] ?? PROJECT_STATUS.PLANNING;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link
          href="/portal"
          className="hover:text-foreground transition-colors"
        >
          My Projects
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="font-medium text-foreground">{project.name}</span>
      </nav>

      {/* Project Header */}
      <Card className="shadow-xs">
        <CardContent className="p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">
                  {project.name}
                </h1>
                <Badge variant={statusConfig.variant}>
                  {statusConfig.label}
                </Badge>
              </div>
              {project.description && (
                <p className="text-sm text-muted-foreground max-w-3xl">
                  {project.description}
                </p>
              )}
            </div>
          </div>

          {/* Progress */}
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-semibold tabular-nums">
                {project.progress}%
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-500"
                style={{ width: `${project.progress}%` }}
              />
            </div>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-border text-xs">
            {project.client && (
              <div>
                <span className="text-muted-foreground block mb-1">
                  Working with
                </span>
                <span className="font-medium flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  {project.client.company || project.client.name}
                </span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground block mb-1">Due Date</span>
              <span className="font-medium flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(project.dueDate)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block mb-1">
                Deliverables
              </span>
              <span className="font-medium">{deliverables.length} total</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deliverables */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FileCheck className="size-5 text-muted-foreground" />
          Deliverables
          <span className="text-sm font-normal text-muted-foreground">
            ({deliverables.length})
          </span>
        </h2>

        {deliverables.length === 0 ? (
          <EmptyState
            icon={<FileCheck className="size-5 text-muted-foreground" />}
            title="No deliverables yet"
            description="Deliverables will appear here as they are submitted."
          />
        ) : (
          <div className="space-y-3">
            {deliverables.map((deliverable) => {
              const dStatus =
                DELIVERABLE_STATUS[deliverable.status] ??
                DELIVERABLE_STATUS.DRAFT;
              const DIcon = dStatus.icon;

              return (
                <Card key={deliverable.id} className="shadow-xs">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{deliverable.title}</h3>
                          <Badge
                            variant="secondary"
                            className="text-[10px] gap-1"
                          >
                            <DIcon className="size-3" />
                            {dStatus.label}
                          </Badge>
                        </div>
                        {deliverable.description && (
                          <p className="text-xs text-muted-foreground">
                            {deliverable.description}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        Updated {formatDate(deliverable.updatedAt)}
                      </span>
                    </div>

                    {/* Versions & Files */}
                    {deliverable.versions.length > 0 && (
                      <div className="bg-muted/50 rounded-md p-3 border border-border space-y-2">
                        <p className="text-xs font-medium text-foreground">
                          Files
                        </p>
                        <div className="space-y-2">
                          {deliverable.versions.map((ver) => (
                            <div
                              key={ver.id}
                              className="flex items-center justify-between bg-background p-2.5 rounded border border-border text-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="h-4 w-4 text-primary shrink-0" />
                                <div className="min-w-0">
                                  <span className="font-medium">
                                    v{ver.versionNumber} —{" "}
                                    {ver.file?.filename ?? "No file"}
                                  </span>
                                  {ver.file?.size && (
                                    <span className="text-muted-foreground ml-1.5">
                                      ({formatFileSize(ver.file.size)})
                                    </span>
                                  )}
                                </div>
                              </div>
                              {ver.file && (
                                <a
                                  href={`/api/files/${ver.file.id}/download`}
                                  download
                                >
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    className="shrink-0"
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                  </Button>
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {deliverable.versions.length === 0 && (
                      <p className="text-xs text-muted-foreground italic">
                        No files uploaded yet.
                      </p>
                    )}

                    {/* Approve / Reject Actions */}
                    <DeliverableActions
                      deliverableId={deliverable.id}
                      currentStatus={deliverable.status}
                      currentVersion={deliverable.version}
                    />

                    {/* Comments */}
                    <CommentSection
                      targetType="deliverable"
                      targetId={deliverable.id}
                      comments={deliverable.comments}
                      viewerEmail={session.email}
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Requests */}
      <RequestSection
        projectId={project.id}
        requests={requests}
        viewerEmail={session.email}
      />

      {/* Invoices */}
      <PortalInvoiceSection invoices={invoices} />

      {/* Activity */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ActivityIcon className="size-5 text-muted-foreground" />
          Activity
          <span className="text-sm font-normal text-muted-foreground">
            ({activities.length})
          </span>
        </h2>

        {activities.length === 0 ? (
          <EmptyState
            icon={<ActivityIcon className="size-5 text-muted-foreground" />}
            title="No activity yet"
            description="Activity for this project will appear here."
          />
        ) : (
          <Card className="shadow-xs">
            <CardContent className="p-5">
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                {activities.map((act) => (
                  <div key={act.id} className="relative text-xs space-y-1 ">
                    <div className="absolute -left-5 top-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background" />
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {act.actorName ?? "System"}
                      </span>
                      <span className="text-muted-foreground">
                        · {formatDateTime(act.createdAt)}
                      </span>
                    </div>
                    <p className="text-muted-foreground">
                      {ACTIVITY_LABELS[act.type] ??
                        act.type.replace(/_/g, " ").toLowerCase()}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}

// ──────────────────────────────────────────────
// Empty State
// ──────────────────────────────────────────────

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/25 p-12 text-center">
      <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted">
        {icon}
      </div>
      <h3 className="mt-3 text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
