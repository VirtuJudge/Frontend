"use client";

import React, { useState, useRef } from "react";
import { Modal, Text, Button } from "@/components";
import { useDirectUpload } from "@/hooks/use-direct-upload";
import { cn } from "@/lib/utils";

export interface UploadAssetModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onAssetUploaded?: () => void;
}

export function UploadAssetModal({
  projectId,
  isOpen,
  onClose,
  onAssetUploaded,
}: UploadAssetModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { uploadFiles, isUploading, items } = useDirectUpload({
    projectId,
    onUploadSuccess: () => {
      onAssetUploaded?.();
      onClose();
    },
    onUploadError: (err) => {
      setErrorMessage(err.message || "Failed to upload asset");
    },
  });

  const handleFiles = async (files: File[]) => {
    setErrorMessage(null);
    if (!files.length) return;

    const validFiles = files.filter((f) => {
      const ext = f.name.toLowerCase();
      return ext.endsWith(".pdf") || ext.endsWith(".pptx");
    });

    if (validFiles.length === 0) {
      setErrorMessage("Only PDF and PPTX files are supported.");
      return;
    }

    const oversized = validFiles.find((f) => f.size > 25 * 1024 * 1024);
    if (oversized) {
      setErrorMessage(`"${oversized.name}" exceeds the 25 MB size limit.`);
      return;
    }

    try {
      await uploadFiles(validFiles, "supporting_document");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to upload asset.",
      );
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isUploading) return;
    if (e.dataTransfer.files?.length) {
      await handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isUploading) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleClickDropzone = () => {
    if (!isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      await handleFiles(Array.from(e.target.files));
    }
    e.target.value = "";
  };

  const activeItem = items[items.length - 1];

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isUploading) {
          setErrorMessage(null);
          onClose();
        }
      }}
      title="Upload assets"
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.pptx"
        className="hidden"
        disabled={isUploading}
        onChange={handleInputChange}
      />

      <div className="flex flex-col items-center justify-center w-full max-w-lg py-2">
        {/* Dashed Dropzone */}
        <div
          role="button"
          tabIndex={isUploading ? -1 : 0}
          aria-disabled={isUploading}
          aria-label="Upload documents dropzone"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClickDropzone}
          onKeyDown={(e) => {
            if (!isUploading && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              handleClickDropzone();
            }
          }}
          className={cn(
            "w-full rounded-[36px] sm:rounded-[44px] border border-dashed transition-all duration-200 flex flex-col items-center justify-center py-10 px-6 sm:py-12 sm:px-12 cursor-pointer group",
            isDragOver
              ? "border-primary bg-primary/10 shadow-[0_0_25px_rgba(6,249,228,0.2)]"
              : "border-primary/40 hover:border-primary/80 bg-transparent hover:bg-white/[0.02]",
            isUploading && "pointer-events-none opacity-80",
          )}
        >
          {/* Document Upload Icon */}
          <div className="mb-3 text-foreground/90 group-hover:text-primary transition-colors flex items-center justify-center">
            <svg
              className="w-10 h-10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <path d="M12 18v-6" />
              <path d="M9 15l3-3 3 3" />
            </svg>
          </div>

          <span className="text-base sm:text-lg font-medium text-foreground/90 group-hover:text-foreground transition-colors text-center">
            {isUploading ? "Uploading file..." : "Drop files here"}
          </span>

          {isUploading && activeItem && (
            <div className="w-full max-w-xs mt-3 flex flex-col items-center gap-1.5">
              <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${activeItem.progress || 50}%` }}
                />
              </div>
              <span className="text-xs text-primary font-mono">
                {activeItem.stage}... {activeItem.progress}%
              </span>
            </div>
          )}
        </div>

        {/* Formats Note */}
        <span className="text-xs sm:text-sm text-foreground/50 font-mono tracking-wider mt-4">
          pdf, pptx
        </span>

        {errorMessage && (
          <div
            role="alert"
            className="mt-4 p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger-lighter text-sm text-center w-full max-w-md"
          >
            {errorMessage}
          </div>
        )}
      </div>
    </Modal>
  );
}
