"use client";

import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import { Asset } from "@/lib/api/types";
import { formatFileSize } from "@/hooks/use-file-attachments";
import { DocumentVersionSelector } from "@/features/upload/document-version-selector";

interface ProjectDocumentToggleItemProps {
  doc: Asset;
  isSelected: boolean;
  canToggle: boolean;
  selectedVersionIds?: Record<string, string>;
  onToggleProjectDocument?: (doc: Asset) => void;
  onSelectVersion?: (assetId: string, versionId: string) => void;
}

export function ProjectDocumentToggleItem({
  doc,
  isSelected,
  canToggle,
  selectedVersionIds = {},
  onToggleProjectDocument,
  onSelectVersion,
}: ProjectDocumentToggleItemProps) {
  return (
    <div
      onClick={() => {
        if (canToggle) {
          onToggleProjectDocument?.(doc);
        }
      }}
      className={cn(
        "flex items-center justify-between p-2 rounded-xl text-left transition-colors select-none",
        canToggle
          ? "cursor-pointer"
          : "cursor-not-allowed opacity-50",
        isSelected
          ? "bg-primary/20 text-fg"
          : "hover:bg-primary/10 text-fg/80",
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0 mr-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (canToggle) {
              onToggleProjectDocument?.(doc);
            }
          }}
          disabled={!canToggle}
          aria-label={`${isSelected ? "Deselect" : "Select"} ${doc.file_name}`}
          className="text-primary text-xl shrink-0 cursor-pointer disabled:cursor-not-allowed"
        >
          <Icon
            icon={isSelected ? "tabler:checkbox" : "tabler:square"}
          />
        </button>
        <Icon
          icon={
            doc.file_name.endsWith(".pptx")
              ? "tabler:presentation"
              : "tabler:file-type-pdf"
          }
          className="text-2xl text-primary shrink-0"
        />
        <div className="flex flex-col min-w-0 text-left">
          <span className="text-sm sm:text-base font-semibold truncate text-foreground/90 max-w-40 sm:max-w-56">
            {doc.file_name}
          </span>
          <span className="text-xs sm:text-sm text-foreground/60 ">
            {formatFileSize(doc.size_bytes)}
          </span>
        </div>
      </div>

      {isSelected && onSelectVersion && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="shrink-0"
        >
          <DocumentVersionSelector
            versions={doc.versions}
            selectedVersionId={selectedVersionIds[doc.id]}
            onSelectVersion={(vId) => onSelectVersion(doc.id, vId)}
          />
        </div>
      )}
    </div>
  );
}
