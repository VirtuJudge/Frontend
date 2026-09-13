"use client";

import { useState, useRef, useEffect } from "react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/button";
import { useClickOutside } from "@/hooks/use-click-outside";
import { cn } from "@/lib/utils";
import { MAX_FILES, formatFileSize } from "@/hooks/use-file-attachments";
import { Asset } from "@/lib/api/types";
import { formatBytes } from "@/lib/upload";
import { DocumentVersionSelector } from "@/features/upload/document-version-selector";
import { Text } from "@/components/text";

export interface UploadedFileItem {
  name: string;
  size: number;
  id?: string;
  assetId?: string;
  versionId?: string;
}

export interface UploadedFilesDropdownProps {
  attachedFiles?: (File | UploadedFileItem)[];
  selectedFileIndex?: number;
  currentSelectedFile?: File | UploadedFileItem;
  onSelectFile?: (index: number) => void;
  onRemoveFile?: (index: number) => void;
  projectDocuments?: Asset[];
  selectedAssetIds?: string[];
  selectedVersionIds?: Record<string, string>;
  onToggleProjectDocument?: (doc: Asset) => void;
  onSelectVersion?: (assetId: string, versionId: string) => void;
  onDownload?: (doc: Asset) => void;
  onNewVersion?: (doc: Asset) => void;
  mode?: "prepare" | "project";
  maxFiles?: number;
  defaultOpen?: boolean;
}

export function UploadedFilesDropdown({
  attachedFiles = [],
  selectedFileIndex = 0,
  onSelectFile,
  onRemoveFile,
  projectDocuments = [],
  selectedAssetIds = [],
  selectedVersionIds = {},
  onToggleProjectDocument,
  onSelectVersion,
  onDownload,
  onNewVersion,
  mode = "prepare",
  maxFiles = MAX_FILES,
  defaultOpen = false,
}: UploadedFilesDropdownProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(defaultOpen);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(dropdownRef, () => setIsDropdownOpen(false), isDropdownOpen);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsDropdownOpen(false);
      }
    }

    if (isDropdownOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isDropdownOpen]);

  const hasProjectDocs = projectDocuments.length > 0;
  const isProjectMode = mode === "project";

  const totalCount = isProjectMode
    ? projectDocuments.length
    : attachedFiles.length;

  const localAttachedFiles = hasProjectDocs
    ? attachedFiles.filter((f) => !("assetId" in f && f.assetId))
    : attachedFiles;

  return (
    <div ref={dropdownRef} className="w-full relative gap-4 flex flex-col">
      <Text size="sm">Select Files you need to attach with the session</Text>
      <button
        type="button"
        onClick={() => {
          setIsDropdownOpen((prev) => !prev);
        }}
        className="w-full flex items-center h-full justify-between px-4 py-3 rounded-2xl border transition-all text-left select-none bg-glass border-primary/40 hover:border-primary text-fg cursor-pointer shadow-sm"
        aria-label="Slides & Documents dropdown"
        aria-expanded={isDropdownOpen}
        aria-haspopup="listbox"
      >
        <div className="flex items-center gap-2.5 overflow-hidden mr-2">
          <Icon icon="tabler:files" className="text-xl shrink-0 text-primary" />
          <p className="font-semibold text-sm sm:text-base truncate text-left">
            Slides & Documents
          </p>
        </div>
        <div className="flex justify-center items-center gap-2 shrink-0 h-full pt-0.5">
          <span className="text-xs sm:text-sm text-fg/60 ">
            {totalCount}/{maxFiles}
          </span>
          <Icon
            icon={isDropdownOpen ? "tabler:chevron-up" : "tabler:chevron-down"}
            className="text-base text-fg/60"
          />
        </div>
      </button>

      {isDropdownOpen && (
        <div className="absolute top-full mt-2 left-0 right-0 z-50 bg-[#021815] border border-primary/30 rounded-2xl p-2.5 shadow-xl backdrop-blur-xl flex flex-col gap-2 overflow-y-auto">
          {!hasProjectDocs && localAttachedFiles.length === 0 && (
            <div className="p-4 text-center text-sm text-foreground/50">
              No documents available
            </div>
          )}
          {isProjectMode ? (
            <div className="flex flex-col gap-2">
              {projectDocuments.map((doc, idx) => {
                const isRejected = doc.state === "rejected";
                const isVerifying = doc.state === "verifying";

                return (
                  <div
                    key={doc.id}
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
              })}
            </div>
          ) : (
            <>
              {hasProjectDocs && (
                <div className="flex flex-col gap-1.5">
                  {projectDocuments.map((doc) => {
                    const isSelected = selectedAssetIds.includes(doc.id);
                    const canToggle =
                      isSelected || attachedFiles.length < maxFiles;

                    return (
                      <div
                        key={doc.id}
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
                              icon={
                                isSelected ? "tabler:checkbox" : "tabler:square"
                              }
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
                              onSelectVersion={(vId) =>
                                onSelectVersion(doc.id, vId)
                              }
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {localAttachedFiles.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between px-2 pt-2 pb-1 text-xs sm:text-sm text-fg/60 border-b border-fg/5">
                <div className="flex items-center gap-1.5 font-semibold text-fg/80">
                  <Icon
                    icon="tabler:upload"
                    className="text-primary text-base shrink-0"
                  />
                  <span>
                    Files ({attachedFiles.length}/{maxFiles})
                  </span>
                </div>
                {hasProjectDocs && (
                  <span className=" text-xs sm:text-sm text-fg/50">
                    {localAttachedFiles.length} uploaded
                  </span>
                )}
              </div>

              {localAttachedFiles.map((file, idx) => {
                const globalIndex = attachedFiles.indexOf(file);
                return (
                  <div
                    key={`${file.name}-${idx}`}
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
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
