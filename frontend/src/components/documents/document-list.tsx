"use client";

import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  FileText,
  FileImage,
  FileSpreadsheet,
  File,
  Download,
  Trash2,
  ExternalLink,
  MoreHorizontal,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";

export interface Document {
  _id: Id<"documents">;
  name: string;
  mimeType: string;
  storageId: string;
  url?: string;
  fileSize?: number;
  contactId?: Id<"contacts">;
  opportunityId?: Id<"opportunities">;
  invoiceId?: Id<"invoices">;
  uploadedBy?: Id<"users">;
  isDeleted: boolean;
  createdAt: number;
  uploadedByUser?: { _id: Id<"users">; fullName: string } | null;
}

interface DocumentListProps {
  documents: Document[] | undefined;
  isLoading?: boolean;
  emptyMessage?: string;
  onDelete?: (documentId: Id<"documents">) => void;
  showUploader?: boolean;
  className?: string;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) {
    return FileImage;
  }
  if (mimeType === "application/pdf") {
    return FileText;
  }
  if (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    mimeType === "text/csv"
  ) {
    return FileSpreadsheet;
  }
  return File;
}

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return "";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getFileTypeLabel(mimeType: string): string {
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.includes("word")) return "DOC";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "XLS";
  if (mimeType === "text/csv") return "CSV";
  if (mimeType === "text/plain") return "TXT";
  if (mimeType.startsWith("image/")) {
    const ext = mimeType.split("/")[1]?.toUpperCase();
    return ext || "IMG";
  }
  return "FILE";
}

export function DocumentList({
  documents,
  isLoading,
  emptyMessage = "No documents uploaded",
  onDelete,
  showUploader = true,
  className,
}: DocumentListProps) {
  const [deletingId, setDeletingId] = useState<Id<"documents"> | null>(null);
  const removeDocument = useMutation(api.documents.remove);

  const handleDelete = async (documentId: Id<"documents">) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    setDeletingId(documentId);
    try {
      await removeDocument({ id: documentId });
      onDelete?.(documentId);
    } catch (error) {
      console.error("Failed to delete document:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = (doc: Document) => {
    if (doc.url) {
      window.open(doc.url, "_blank");
    }
  };

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center py-12", className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <div className={cn("text-center py-8 text-muted-foreground", className)}>
        <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {documents.map((doc) => {
        const FileIcon = getFileIcon(doc.mimeType);
        const isDeleting = deletingId === doc._id;

        return (
          <div
            key={doc._id}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg border bg-white hover:bg-muted/50 transition-colors group",
              isDeleting && "opacity-50"
            )}
          >
            {/* File icon with type badge */}
            <div className="relative">
              <FileIcon className="h-10 w-10 text-muted-foreground" />
              <span className="absolute -bottom-1 -right-1 text-[10px] font-medium bg-muted px-1 rounded">
                {getFileTypeLabel(doc.mimeType)}
              </span>
            </div>

            {/* File details */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{doc.name}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                {doc.fileSize && <span>{formatFileSize(doc.fileSize)}</span>}
                {doc.fileSize && <span>•</span>}
                <span>{formatDate(doc.createdAt)}</span>
                {showUploader && doc.uploadedByUser && (
                  <>
                    <span>•</span>
                    <span>{doc.uploadedByUser.fullName}</span>
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleDownload(doc)}
                disabled={!doc.url || isDeleting}
              >
                <Download className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MoreHorizontal className="h-4 w-4" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handleDownload(doc)}
                    disabled={!doc.url}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open in new tab
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDelete(doc._id)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        );
      })}
    </div>
  );
}
