"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { FileUpload, type UploadedFile } from "@/components/ui/file-upload";
import { createDeliverable, addDeliverableVersion } from "@/lib/actions/deliverable";
import { createFile } from "@/lib/actions/file";

export function CreateDeliverableDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const router = useRouter();

  const form = useForm({
    defaultValues: {
      title: "",
      description: "",
      notes: "",
    },
    onSubmit: async ({ value }) => {
      try {
        // 1. Create the deliverable
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

        // 2. If a file was uploaded, save it and attach as version 1
        if (uploadedFile) {
          const fileResult = await createFile({
            key: uploadedFile.key,
            filename: uploadedFile.name,
            mimeType: uploadedFile.type,
            size: uploadedFile.size,
          });

          if (fileResult.success) {
            await addDeliverableVersion({
              deliverableId: result.data.id,
              versionNumber: 1,
              fileId: fileResult.data.id,
              notes: value.notes.trim() || null,
            });
          }
        }

        toast.add({
          type: "success",
          title: "Deliverable created",
          description: `"${result.data.title}" has been added.`,
        });

        form.reset();
        setUploadedFile(null);
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

          <div className="flex flex-col gap-1.5">
            <Label>File (optional)</Label>
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
          </div>

          {uploadedFile && (
            <form.Field name="notes">
              {(field) => (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={field.name}>Version Notes (optional)</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="e.g. Initial draft for review"
                  />
                </div>
              )}
            </form.Field>
          )}

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
