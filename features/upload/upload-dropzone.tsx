"use client";

import { useState, useRef } from "react";
import { Icon } from "@iconify/react";
import { AssetKind } from "@/lib/api/types";
import { UPLOAD_RULES, formatBytes } from "@/lib/upload";
import { Text } from "@/components";

export interface UploadDropzoneProps {
  kind: AssetKind;
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  maxFiles?: number;
  currentCount?: number;
  label?: string;
  subLabel?: string;
}

export function UploadDropzone({
  kind,
  onFilesSelected,
  disabled = false,
  maxFiles,
  currentCount = 0,
  label,
  subLabel,
}: UploadDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const rule = UPLOAD_RULES[kind];
  const isLimitReached = maxFiles !== undefined && currentCount >= maxFiles;
  const isDisabled = disabled || isLimitReached;

  const acceptString = rule.allowedExtensions.join(",");

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0 || isDisabled) return;
    const files = Array.from(fileList);
    const availableSlots = maxFiles !== undefined ? maxFiles - currentCount : files.length;
    const filesToUpload = files.slice(0, Math.max(0, availableSlots));
    if (filesToUpload.length > 0) {
      onFilesSelected(filesToUpload);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isDisabled) return;
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isDisabled) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleClick = () => {
    if (!isDisabled && inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.click();
    }
  };

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        multiple={kind === "supporting_document"}
        accept={acceptString}
        className="hidden"
        disabled={isDisabled}
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div
        role="button"
        tabIndex={isDisabled ? -1 : 0}
        aria-disabled={isDisabled}
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onKeyDown={(e) => {
          if (!isDisabled && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            handleClick();
          }
        }}
        className={`relative border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-all cursor-pointer select-none ${
          isDisabled
            ? "border-foreground/10 bg-foreground/5 opacity-60 cursor-not-allowed"
            : isDragOver
              ? "border-primary bg-primary/10 shadow-lg"
              : "border-foreground/15 hover:border-primary/50 bg-foreground/5 hover:bg-foreground/10"
        }`}
      >
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-transform ${
            isDragOver ? "scale-110" : ""
          } ${
            kind === "presentation_video"
              ? "bg-purple-500/20 text-purple-400"
              : "bg-blue-500/20 text-blue-400"
          }`}
        >
          <Icon
            icon={
              isLimitReached
                ? "tabler:circle-check"
                : isDragOver
                  ? "tabler:upload"
                  : kind === "presentation_video"
                    ? "tabler:video-plus"
                    : "tabler:file-plus"
            }
            className="text-2xl"
          />
        </div>

        <Text size="sm" className="font-bold text-foreground/90 mb-1">
          {isLimitReached
            ? `Limit reached (${maxFiles}/${maxFiles})`
            : label || (kind === "presentation_video" ? "Upload pitch video" : "Upload supporting documents")}
        </Text>

        <Text size="xs" className="text-foreground/60 max-w-sm mb-3">
          {isLimitReached
            ? "Maximum number of files reached for this category"
            : subLabel || "Drag & drop file here or click to browse from device"}
        </Text>

        <div className="flex items-center gap-2 flex-wrap justify-center text-xs text-foreground/50">
          <span className="px-2 py-0.5 rounded-md bg-foreground/5 border border-foreground/10">
            {rule.allowedExtensions.join(", ")}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-foreground/5 border border-foreground/10">
            Max {formatBytes(rule.maxSizeBytes)}
          </span>
          {rule.maxDurationMs && (
            <span className="px-2 py-0.5 rounded-md bg-foreground/5 border border-foreground/10">
              Max {Math.round(rule.maxDurationMs / 60000)} min
            </span>
          )}
          {maxFiles && (
            <span className="px-2 py-0.5 rounded-md bg-foreground/5 border border-foreground/10">
              {currentCount} / {maxFiles} files
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
