"use client";

import { RefObject } from "react";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/hooks/use-file-attachments";
import { UploadedFileItem } from "./uploaded-files-dropdown";

export interface FileDropzoneProps {
  attachedFiles: (File | UploadedFileItem)[];
  currentSelectedFile?: File | UploadedFileItem;
  isDropzoneDragOver: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClick: () => void;
}

export function FileDropzone({
  attachedFiles,
  currentSelectedFile,
  isDropzoneDragOver,
  fileInputRef,
  onDrop,
  onDragOver,
  onDragLeave,
  onFileInputChange,
  onClick,
}: FileDropzoneProps) {
  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.pptx"
        className="hidden"
        onChange={onFileInputChange}
      />

      <div
        role="button"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => onClick()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        }}
        className={cn(
          "w-60 sm:w-68 h-36 sm:h-40 rounded-[50px] border border-dashed transition-all flex flex-col items-center justify-center relative group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          isDropzoneDragOver
            ? "border-primary bg-primary/15 cursor-pointer"
            : "border-[#06F9E4]/40 bg-[#021312]/60 hover:border-[#06F9E4]/80 hover:bg-[#021f1c]/60 cursor-pointer",
        )}
      >
        {attachedFiles.length > 0 ? (
          <div className="flex flex-col items-center px-4 max-w-full">
            <Icon
              icon={
                currentSelectedFile?.name.endsWith(".pdf")
                  ? "tabler:file-type-pdf"
                  : "tabler:file-type-pptx"
              }
              className="text-4xl text-primary mb-1.5"
            />
            <span className="text-sm sm:text-base font-semibold text-fg truncate max-w-52 sm:max-w-60 text-center">
              {currentSelectedFile?.name}
            </span>
            <span className="text-xs sm:text-sm text-foreground/60  text-center">
              {formatFileSize(currentSelectedFile?.size || 0)}
            </span>
            <span className="text-xs sm:text-sm text-primary/85 mt-1 font-medium text-center">
              + Add more
            </span>
          </div>
        ) : (
          <>
            <Icon
              icon="tabler:file-upload-filled"
              className="text-4xl mb-2 text-primary transition-all"
            />
            <span className="text-foreground/75 group-hover:text-foreground transition-colors font-medium text-center">
              Drop here
            </span>
          </>
        )}
      </div>
    </>
  );
}
