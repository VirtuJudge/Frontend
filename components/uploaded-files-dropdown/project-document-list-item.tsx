"use client";

import { Icon } from "@iconify/react";
import { Button } from "@/components/button";
import { cn } from "@/lib/utils";
import { Asset } from "@/lib/api/types";
import { formatBytes } from "@/lib/upload";
import { DocumentVersionSelector } from "@/features/upload/document-version-selector";

interface ProjectDocumentListItemProps {
  doc: Asset;
  idx: number;
  selectedFileIndex?: number;
  selectedVersionIds?: Record<string, string>;
  onSelectFile?: (index: number) => void;
  onSelectVersion?: (assetId: string, versionId: string) => void;
  onDownload?: (doc: Asset) => void;
  onNewVersion?: (doc: Asset) => void;
}

export function ProjectDocumentListItem({
  doc,
  idx,
  selectedFileIndex,
  selectedVersionIds = {},
  onSelectFile,
  onSelectVersion,
  onDownload,
  onNewVersion,
}: ProjectDocumentListItemProps) {
  const isRejected = doc.state === "rejected";
  const isVerifying = doc.state === "verifying";

  return (
    <div
      onClick={() => onSelectFile?.(idx)}
      className={cn(
        "p-3 rounded-xl bg-foreground/5 border border-foreground/10 flex flex-col gap-2 text-left transition-colors cursor-pointer",
        selectedFileIndex === idx
          ? "ring-1 ring-primary bg-primary/10"
          : "hover:bg-foreground/10",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <Icon
            icon={
              doc.file_name.endsWith(".pptx")
                ? "tabler:presentation"
                : "tabler:file-text"
            }
            className="text-2xl text-primary shrink-0"
          />
          <div className="flex flex-col min-w-0">
            <span className="text-sm sm:text-base font-semibold truncate text-foreground/90 max-w-44 sm:max-w-64">
              {doc.file_name}
            </span>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-foreground/60 ">
              <span>{formatBytes(doc.size_bytes)}</span>
              <span>•</span>
              <span>
                {new Date(doc.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onSelectVersion && (
            <DocumentVersionSelector
              versions={doc.versions}
              selectedVersionId={
                selectedVersionIds[doc.id] ||
                doc.version_id ||
                doc.versions?.[doc.versions.length - 1]?.id
              }
              onSelectVersion={(vId) =>
                onSelectVersion(doc.id, vId)
              }
            />
          )}

          {isVerifying && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 animate-pulse">
              Verifying
            </span>
          )}

          {isRejected && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
              Rejected
            </span>
          )}
        </div>
      </div>

      {isRejected && (
        <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-start gap-1.5">
          <Icon
            icon="tabler:alert-triangle"
            className="text-sm shrink-0 mt-0.5 text-red-400"
          />
          <span>
            {doc.rejection_reason || "Rejected by server"}
          </span>
        </div>
      )}

      <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-foreground/5">
        {onDownload && (
          <Button
            variant="glass"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDownload(doc);
            }}
            className="text-xs px-2 py-1 h-7"
          >
            <Icon icon="tabler:download" className="text-xs" />
            Download
          </Button>
        )}
        {onNewVersion && (
          <Button
            variant="glass"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onNewVersion(doc);
            }}
            className="text-xs px-2 py-1 h-7 text-primary"
          >
            <Icon icon="tabler:upload" className="text-xs" />
            Version
          </Button>
        )}
      </div>
    </div>
  );
}
