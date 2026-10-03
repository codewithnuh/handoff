"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Download,
  Trash2,
  Circle,
  MoreHorizontal,
  Upload,
  MessageSquare,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import { FileUpload, type UploadedFile } from "@/components/ui/file-upload";
import type { ViewerPermissions } from "./types";
import type { ProjectDetailData } from "@/lib/queries/project-detail";
import {
  updateDeliverable,
  deleteDeliverable,
  addDeliverableVersion,
} from "@/lib/actions/deliverable";
import { useServerAction } from "@/hooks/use-server-action";
import { DeliverableStatusBadge } from "./status-badges";
import { formatDate } from "@/lib/presentational/format";
import { DeleteConfirmDialog } from "./delete-confirm-dialog";
import { DashboardCommentSection } from "./comment-section";

type DeliverableItem = ProjectDetailData["deliverables"][number];

export function DeliverableCard({
  item,
  projectId,
  permissions,
  currentUserId,
}: {
  item: DeliverableItem;
  projectId: string;
  permissions: ViewerPermissions;
  currentUserId: string;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [versionNotes, setVersionNotes] = useState("");
  const router = useRouter();

  const remove = useServerAction(deleteDeliverable, {
    success: "Deliverable deleted",
    successDescription: () => "The deliverable has been removed.",
    failure: "Delete failed",
    onSuccess: () => setDeleteOpen(false),
  });

  const addVersion = useServerAction(addDeliverableVersion, {
    failure: "Version creation failed",
    failureDescription: (error, message) =>
      error.code === "CONFLICT"
        ? "This deliverable changed. Refresh and retry the upload."
        : message,
    refresh: false,
    onError: (error) => {
      if (error.code === "CONFLICT") router.refresh();
    },
  });

  const statusChange = useServerAction(updateDeliverable, {
    success: "Status updated",
    successDescription: (data) =>
      `Deliverable marked as ${data.status.replace(/_/g, " ").toLowerCase()}.`,
    failure: (error) =>
      error.code === "CONFLICT" ? "Outdated view" : "Update failed",
    failureDescription: (error, message) =>
      error.code === "CONFLICT"
        ? "This deliverable was changed by your client. Refreshing…"
        : message,
    thrownDescription: () => "Please try again.",
    onError: () => router.refresh(),
    onThrown: () => router.refresh(),
  });

  const isUploading = addVersion.pending;

  const isDraft = item.status === "DRAFT";
  const isApproved = item.status === "APPROVED";
  const canSubmit = permissions.canSubmitForReview;
  const canDelete = canSubmit && isDraft;
  const canUploadVersion =
    permissions.canManageDeliverables &&
    !isApproved &&
    (isDraft || canSubmit);
  const hasMenuActions =
    canUploadVersion ||
    (canSubmit &&
      (isDraft ||
        item.status === "IN_REVIEW" ||
        item.status === "CHANGES_REQUESTED"));

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === item.status) return;
    await statusChange.run({
      id: item.id,
      status: newStatus as
        | "DRAFT"
        | "IN_REVIEW"
        | "CHANGES_REQUESTED"
        | "APPROVED",
      expectedVersion: item.version,
    });
  };

  const handleDelete = async () => {
    await remove.run({ id: item.id });
  };

  const handleUploadVersion = async () => {
    if (!uploadedFile) return;

    // Create a version referencing the server verified upload record.
    const versionResult = await addVersion.run({
      deliverableId: item.id,
      expectedVersion: item.version,
      fileId: uploadedFile.fileId,
      notes: versionNotes.trim() || null,
    });

    if (!versionResult?.success) return;

    toast.add({
      type: "success",
      title: "Version uploaded",
      description: `Version ${versionResult.data.versionNumber} has been added.`,
    });

    setUploadedFile(null);
    setVersionNotes("");
    setUploadOpen(false);
    router.refresh();
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
            {hasMenuActions && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="ghost" size="icon-sm" />}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canUploadVersion && (
                    <DropdownMenuItem onClick={() => setUploadOpen(true)}>
                      <Upload className="h-3.5 w-3.5" />
                      Upload New Version
                    </DropdownMenuItem>
                  )}
                  {canSubmit && (isDraft || item.status === "CHANGES_REQUESTED") && (
                    <DropdownMenuItem
                      onClick={() => handleStatusChange("IN_REVIEW")}
                      disabled={statusChange.pending}
                    >
                      <Circle className="h-3.5 w-3.5" />
                      Submit for Review
                    </DropdownMenuItem>
                  )}
                  {canSubmit && item.status === "IN_REVIEW" && (
                    <DropdownMenuItem
                      onClick={() => handleStatusChange("DRAFT")}
                      disabled={statusChange.pending}
                    >
                      <Circle className="h-3.5 w-3.5" />
                      Move back to Draft
                    </DropdownMenuItem>
                  )}
                  {canSubmit && canDelete && <DropdownMenuSeparator />}
                  {canDelete && (
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setDeleteOpen(true)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete Deliverable
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
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
                      <a href={`/api/files/${ver.file.id}/download`}>
                      <Button variant="ghost" size="icon-sm" aria-label="Download file">
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      </a>
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

          {/* Comments */}
          <div className="border-t border-border pt-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="font-medium">
                Comments ({item.comments.length})
              </span>
            </div>
            <DashboardCommentSection
              targetType="deliverable"
              targetId={item.id}
              comments={item.comments}
              currentUserId={currentUserId}
            />
          </div>
        </CardContent>
      </Card>

      {/* Upload New Version Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Upload New Version</DialogTitle>
            <DialogDescription>
              Upload a new file for &quot;{item.title}&quot;. The next version is
              allocated when the upload is saved.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <FileUpload
              projectId={projectId}
              deliverableId={item.id}
              onUploadComplete={(file) => setUploadedFile(file)}
              onUploadError={(error) =>
                toast.add({
                  type: "error",
                  title: "Upload failed",
                  description: error.message,
                })
              }
            />

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="version-notes">Notes (optional)</Label>
              <Input
                id="version-notes"
                value={versionNotes}
                onChange={(e) => setVersionNotes(e.target.value)}
                placeholder="e.g. Fixed the header layout"
              />
            </div>

            <Button
              onClick={handleUploadVersion}
              disabled={!uploadedFile || isUploading}
            >
              {isUploading ? "Uploading..." : "Upload Version"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {canDelete && (
        <DeleteConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          onConfirm={handleDelete}
          title="Delete Deliverable"
          description={`Are you sure you want to delete "${item.title}"? This action cannot be undone.`}
          isDeleting={remove.pending}
        />
      )}
    </>
  );
}
