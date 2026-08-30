"use client";

/**
 * FileUpload — drag-and-drop file upload powered by Uploadthing.
 *
 * Returns the uploaded file metadata on success so the caller can
 * link it to a File record in the database.
 */

import React, { useState, useCallback } from "react";
import { useDropzone } from "@uploadthing/react";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type UploadedFile = {
  url: string;
  name: string;
  size: number;
  type: string;
  key: string;
};

interface FileUploadProps {
  onUploadComplete: (file: UploadedFile) => void;
  onUploadError?: (error: Error) => void;
  disabled?: boolean;
  className?: string;
  accept?: string[];
}

export function FileUpload({
  onUploadComplete,
  onUploadError,
  disabled = false,
  className,
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append("files", file);

        const response = await fetch("/api/uploadthing", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Upload failed");
        }

        const result = await response.json();

        if (result?.[0]) {
          const uploaded: UploadedFile = {
            url: result[0].url ?? result[0].ufsUrl ?? "",
            name: result[0].name ?? file.name,
            size: result[0].size ?? file.size,
            type: result[0].type ?? file.type,
            key: result[0].key ?? result[0].key ?? "",
          };
          setUploadedFile(uploaded);
          onUploadComplete(uploaded);
        }
      } catch (error) {
        onUploadError?.(
          error instanceof Error ? error : new Error("Upload failed"),
        );
      } finally {
        setIsUploading(false);
      }
    },
    [onUploadComplete, onUploadError],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    disabled: disabled || isUploading,
  });

  const removeFile = () => {
    setUploadedFile(null);
  };

  if (uploadedFile) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 p-3 text-xs">
        <FileText className="h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{uploadedFile.name}</p>
          <p className="text-muted-foreground">
            {formatFileSize(uploadedFile.size)}
          </p>
        </div>
        {!disabled && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={removeFile}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-muted-foreground/25 bg-muted/25 p-6 text-center transition-colors hover:border-muted-foreground/50 hover:bg-muted/50",
        isDragActive && "border-primary/50 bg-primary/5",
        (disabled || isUploading) && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <input {...getInputProps()} />
      {isUploading ? (
        <Loader2 className="mb-2 h-6 w-6 animate-spin text-muted-foreground" />
      ) : (
        <Upload className="mb-2 h-6 w-6 text-muted-foreground" />
      )}
      <p className="text-xs font-medium">
        {isUploading
          ? "Uploading..."
          : isDragActive
            ? "Drop the file here"
            : "Drag & drop a file here, or click to select"}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Images, PDFs, documents, ZIPs up to 50MB
      </p>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
