"use client";

import { useState, useRef, useEffect } from "react";
import { Icon } from "@iconify/react";
import { useClickOutside } from "@/hooks/use-click-outside";
import { MAX_FILES } from "@/hooks/use-file-attachments";
import { Text } from "@/components/text";
import { UploadedFilesDropdownProps } from "./types";
import { ProjectDocumentListItem } from "./project-document-list-item";
import { ProjectDocumentToggleItem } from "./project-document-toggle-item";
import { LocalFileItem } from "./local-file-item";

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
              {projectDocuments.map((doc, idx) => (
                <ProjectDocumentListItem
                  key={doc.id}
                  doc={doc}
                  idx={idx}
                  selectedFileIndex={selectedFileIndex}
                  selectedVersionIds={selectedVersionIds}
                  onSelectFile={onSelectFile}
                  onSelectVersion={onSelectVersion}
                  onDownload={onDownload}
                  onNewVersion={onNewVersion}
                />
              ))}
            </div>
          ) : (
            <>
              {hasProjectDocs && (
                <div className="flex flex-col gap-1.5 max-h-80 overflow-y-auto">
                  {projectDocuments.map((doc) => {
                    const isSelected = selectedAssetIds.includes(doc.id);
                    const canToggle =
                      isSelected || attachedFiles.length < maxFiles;
                    return (
                      <ProjectDocumentToggleItem
                        key={doc.id}
                        doc={doc}
                        isSelected={isSelected}
                        canToggle={canToggle}
                        selectedVersionIds={selectedVersionIds}
                        onToggleProjectDocument={onToggleProjectDocument}
                        onSelectVersion={onSelectVersion}
                      />
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
                  <LocalFileItem
                    key={`${file.name}-${idx}`}
                    file={file}
                    globalIndex={globalIndex}
                    selectedFileIndex={selectedFileIndex}
                    onSelectFile={onSelectFile}
                    onRemoveFile={onRemoveFile}
                    setIsDropdownOpen={setIsDropdownOpen}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
