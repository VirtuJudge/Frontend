"use client";

import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/hooks/use-file-attachments";
import { UploadedFileItem } from "./types";

interface LocalFileItemProps {
  file: File | UploadedFileItem;
  globalIndex: number;
  selectedFileIndex?: number;
  onSelectFile?: (index: number) => void;
  onRemoveFile?: (index: number) => void;
  setIsDropdownOpen: (open: boolean) => void;
}

export function LocalFileItem({
  file,
  globalIndex,
  selectedFileIndex,
  onSelectFile,
  onRemoveFile,
  setIsDropdownOpen,
}: LocalFileItemProps) {
  return (
    <div
      onClick={() => {
        if (globalIndex !== -1) {
          onSelectFile?.(globalIndex);
          setIsDropdownOpen(false);
        }
      }}
      className={cn(
        "flex items-center justify-between p-2.5 rounded-xl text-left cursor-pointer transition-colors group",
        selectedFileIndex === globalIndex
          ? "bg-primary/20 text-fg"
          : "hover:bg-primary/10 text-fg/80",
      )}
    >
      <div className="flex items-center gap-3 overflow-hidden mr-2">
        <Icon
          icon={
            file.name.endsWith(".pdf")
              ? "tabler:file-type-pdf"
              : "tabler:file-type-ppt"
          }
          className="text-2xl sm:text-3xl text-primary shrink-0"
        />
        <div className="flex flex-col overflow-hidden text-left">
          <span className="font-semibold text-sm sm:text-base truncate text-fg text-left">
            {file.name}
          </span>
          <span className="text-xs sm:text-sm text-fg/60  text-left">
            {formatFileSize(file.size)}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (globalIndex !== -1) {
            onRemoveFile?.(globalIndex);
          }
        }}
        className="text-fg/40 hover:text-danger p-1 shrink-0 transition-colors cursor-pointer"
        aria-label={`Remove ${file.name}`}
      >
        <Icon icon="tabler:trash" className="text-xl" />
      </button>
    </div>
  );
}
