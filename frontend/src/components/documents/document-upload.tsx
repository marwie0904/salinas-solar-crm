"use client";

import { useState, useRef, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Upload,
  FileText,
  FileImage,
  File,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface DocumentUploadProps {
  contactId?: Id<"contacts">;
  opportunityId?: Id<"opportunities">;
  invoiceId?: Id<"invoices">;
  onUploadComplete?: (documentId: Id<"documents">) => void;
  onError?: (error: string) => void;
  className?: string;
  compact?: boolean;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: "uploading" | "success" | "error";
  error?: string;
  documentId?: Id<"documents">;
}

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "text/plain",
  "text/csv",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) {
    return FileImage;
  }
  if (mimeType === "application/pdf") {
    return FileText;
  }
  return File;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function DocumentUpload({
  contactId,
  opportunityId,
  invoiceId,
  onUploadComplete,
  onError,
  className,
  compact = false,
}: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const createDocument = useMutation(api.documents.create);

  const uploadFile = useCallback(
    async (file: File) => {
      // Validate file type
      if (!ACCEPTED_TYPES.includes(file.type)) {
        const error = `File type not supported: ${file.type || "unknown"}`;
        onError?.(error);
        return { status: "error" as const, error };
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        const error = `File too large: ${formatFileSize(file.size)} (max ${formatFileSize(MAX_FILE_SIZE)})`;
        onError?.(error);
        return { status: "error" as const, error };
      }

      try {
        // Get upload URL from Convex
        const uploadUrl = await generateUploadUrl();

        // Upload file to Convex storage
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!response.ok) {
          throw new Error("Upload failed");
        }

        const { storageId } = await response.json();

        // Create document record
        const documentId = await createDocument({
          name: file.name,
          mimeType: file.type,
          storageId,
          fileSize: file.size,
          contactId,
          opportunityId,
          invoiceId,
        });

        onUploadComplete?.(documentId);
        return { status: "success" as const, documentId };
      } catch (err) {
        const error = err instanceof Error ? err.message : "Upload failed";
        onError?.(error);
        return { status: "error" as const, error };
      }
    },
    [generateUploadUrl, createDocument, contactId, opportunityId, invoiceId, onUploadComplete, onError]
  );

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);

      // Add files to uploading state
      const newUploadingFiles: UploadingFile[] = fileArray.map((file) => ({
        file,
        progress: 0,
        status: "uploading" as const,
      }));

      setUploadingFiles((prev) => [...prev, ...newUploadingFiles]);

      // Upload each file
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        const result = await uploadFile(file);

        setUploadingFiles((prev) =>
          prev.map((uf) =>
            uf.file === file
              ? {
                  ...uf,
                  status: result.status,
                  error: result.error,
                  documentId: result.documentId,
                  progress: 100,
                }
              : uf
          )
        );
      }

      // Clear successful uploads after a delay
      setTimeout(() => {
        setUploadingFiles((prev) => prev.filter((uf) => uf.status === "error"));
      }, 3000);
    },
    [uploadFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFiles(files);
      }
    },
    [handleFiles]
  );

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
    // Reset input
    e.target.value = "";
  };

  const removeUploadingFile = (file: File) => {
    setUploadingFiles((prev) => prev.filter((uf) => uf.file !== file));
  };

  if (compact) {
    return (
      <div className={className}>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES.join(",")}
          onChange={handleFileChange}
          className="hidden"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleClick}
          className="gap-2"
        >
          <Upload className="h-4 w-4" />
          Upload
        </Button>

        {/* Uploading files indicator */}
        {uploadingFiles.length > 0 && (
          <div className="mt-2 space-y-1">
            {uploadingFiles.map((uf, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 text-xs text-muted-foreground"
              >
                {uf.status === "uploading" && (
                  <Loader2 className="h-3 w-3 animate-spin" />
                )}
                {uf.status === "success" && (
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                )}
                {uf.status === "error" && (
                  <AlertCircle className="h-3 w-3 text-red-600" />
                )}
                <span className="truncate max-w-[150px]">{uf.file.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_TYPES.join(",")}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          isDragging
            ? "border-[#ff5603] bg-[#ff5603]/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50"
        )}
      >
        <Upload
          className={cn(
            "h-8 w-8 mx-auto mb-3",
            isDragging ? "text-[#ff5603]" : "text-muted-foreground"
          )}
        />
        <p className="text-sm font-medium">
          {isDragging ? "Drop files here" : "Click to upload or drag and drop"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          PDF, DOC, XLS, Images (max 10MB)
        </p>
      </div>

      {/* Uploading files list */}
      {uploadingFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          {uploadingFiles.map((uf, idx) => {
            const FileIcon = getFileIcon(uf.file.type);
            return (
              <div
                key={idx}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border",
                  uf.status === "error" && "border-red-200 bg-red-50",
                  uf.status === "success" && "border-green-200 bg-green-50"
                )}
              >
                <FileIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{uf.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(uf.file.size)}
                    {uf.error && (
                      <span className="text-red-600 ml-2">{uf.error}</span>
                    )}
                  </p>
                </div>
                {uf.status === "uploading" && (
                  <Loader2 className="h-4 w-4 animate-spin text-[#ff5603]" />
                )}
                {uf.status === "success" && (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                )}
                {uf.status === "error" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeUploadingFile(uf.file);
                    }}
                    className="p-1 hover:bg-red-100 rounded"
                  >
                    <X className="h-4 w-4 text-red-600" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
