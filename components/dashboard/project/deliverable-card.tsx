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
import type { ProjectDetailData } from "@/lib/queries/project";
import {
  updateDeliverable,
  deleteDeliverable,
  addDeliverableVersion,
} from "@/lib/actions/deliverable";
import { createFile } from "@/lib/actions/file";
import { DeliverableStatusBadge } from "./status-badges";
import { formatDate } from "./format";
import { DeleteConfirmDialog } from "./delete-confirm-dialog";
import { DashboardCommentSection } from "./comment-section";

type DeliverableItem = ProjectDetailData["deliverables"][number];

export function DeliverableCard({
  item,
  permissions,
  currentUserId,
}: {
  item: DeliverableItem;
  permissions: ViewerPermissions;
  currentUserId: string;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [versionNotes, setVersionNotes] = useState("");
  const router = useRouter();

  const isDraft = item.status === "DRAFT";
  const canSubmit = permissions.canSubmitForReview;
  const canDelete = canSubmit;

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === item.status) return;
    setIsUpdatingStatus(true);
    try {
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

  const handleUploadVersion = async () => {
    if (!uploadedFile) return;
    setIsUploading(true);
    try {
      // 1. Save file metadata
      const fileResult = await createFile({
        key: uploadedFile.key,
        filename: uploadedFile.name,
        mimeType: uploadedFile.type,
        size: uploadedFile.size,
      });

      if (!fileResult.success) {
        toast.add({
          type: "error",
          title: "Upload failed",
          description: fileResult.message,
        });
        return;
      }

      // 2. Create new version
      const nextVersion = item.versions.length > 0
        ? Math.max(...item.versions.map((v) => v.versionNumber)) + 1
        : 1;

      const versionResult = await addDeliverableVersion({
        deliverableId: item.id,
        versionNumber: nextVersion,
        fileId: fileResult.data.id,
        notes: versionNotes.trim() || null,
      });

      if (!versionResult.success) {
        toast.add({
          type: "error",
          title: "Version creation failed",
          description: versionResult.message,
        });
        return;
      }

      toast.add({
        type: "success",
        title: "Version uploaded",
        description: `Version ${nextVersion} has been added.`,
      });

      setUploadedFile(null);
      setVersionNotes("");
      setUploadOpen(false);
      router.refresh();
    } catch {
      toast.add({
        type: "error",
        title: "Something went wrong",
        description: "Please try again.",
      });
    } finally {
      setIsUploading(false);
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
            {(canSubmit || canDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="ghost" size="icon-sm" />}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {permissions.canManageDeliverables && (
                    <DropdownMenuItem onClick={() => setUploadOpen(true)}>
                      <Upload className="h-3.5 w-3.5" />
                      Upload New Version
                    </DropdownMenuItem>
                  )}
                  {canSubmit && isDraft && (
                    <DropdownMenuItem
                      onClick={() => handleStatusChange("IN_REVIEW")}
                      disabled={isUpdatingStatus}
                    >
                      <Circle className="h-3.5 w-3.5" />
                      Submit for Review
                    </DropdownMenuItem>
                  )}
                  {canSubmit && !isDraft && (
                    <DropdownMenuItem
                      onClick={() => handleStatusChange("DRAFT")}
                      disabled={isUpdatingStatus}
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
              Upload a new file for &quot;{item.title}&quot;. This will be
              version {item.versions.length > 0 ? Math.max(...item.versions.map((v) => v.versionNumber)) + 1 : 1}.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <FileUpload
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
          isDeleting={isDeleting}
        />
      )}
    </>
  );
}
