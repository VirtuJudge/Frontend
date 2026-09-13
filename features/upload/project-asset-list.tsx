"use client";

import { useState, useRef, useMemo } from "react";
import { Icon } from "@iconify/react";
import { Asset } from "@/lib/api/types";
import { Button, Text, Wrapper, FileDropzone } from "@/components";
import { formatBytes } from "@/lib/upload";
import { DocumentVersionSelector } from "./document-version-selector";
import { UploadProgressList } from "./upload-progress-list";
import { useDirectUpload } from "@/hooks/use-direct-upload";
import { useProjectAssets } from "@/hooks/use-project-assets";
import { UploadedFileItem } from "@/components/uploaded-files-dropdown";
import { cn } from "@/lib/utils";

export interface ProjectAssetListProps {
  projectId: string;
  onPresentationReady?: (asset: Asset | null) => void;
  maxDocuments?: number;
}

export function ProjectAssetList({
  projectId,
  maxDocuments = 5,
}: ProjectAssetListProps) {
  const {
    documentAssets,
    refetch,
    selectVersionForAsset,
    getActiveVersionId,
    downloadAsset,
  } = useProjectAssets({ projectId });

  const versionUploadInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [isDropzoneDragOver, setIsDropzoneDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [targetAssetForNewVersion, setTargetAssetForNewVersion] =
    useState<Asset | null>(null);

  const {
    items,
    uploadFile,
    uploadFiles,
    retryUpload,
    cancelUpload,
    removeUploadItem,
  } = useDirectUpload({
    projectId,
    onUploadSuccess: () => {
      refetch();
    },
  });

  const attachedItems: UploadedFileItem[] = useMemo(() => {
    return documentAssets.map((doc) => ({
      id: doc.id,
      assetId: doc.id,
      name: doc.file_name,
      size: doc.size_bytes,
      versionId: getActiveVersionId(doc),
      versions: doc.versions,
    }));
  }, [documentAssets, getActiveVersionId]);

  const isLimitReached = documentAssets.length >= maxDocuments;
  const currentSelectedFile =
    attachedItems[selectedFileIndex] || attachedItems[attachedItems.length - 1];

  const handleDocumentFiles = async (files: File[]) => {
    setFileError(null);
    if (documentAssets.length >= maxDocuments) {
      setFileError(`Maximum ${maxDocuments} files allowed.`);
      return;
    }
    const validFiles = files.filter((f) => {
      const ext = f.name.toLowerCase();
      return ext.endsWith(".pdf") || ext.endsWith(".pptx");
    });
    if (validFiles.length === 0) {
      setFileError("Only PDF and PPTX files are supported");
      return;
    }
    const oversized = validFiles.find((f) => f.size > 25 * 1024 * 1024);
    if (oversized) {
      setFileError(`${oversized.name} exceeds the 25 MB limit.`);
      return;
    }
    const remainingSlots = maxDocuments - documentAssets.length;
    if (validFiles.length > remainingSlots) {
      setFileError(`Maximum ${maxDocuments} files allowed.`);
      return;
    }
    await uploadFiles(validFiles, "supporting_document");
  };

  const handleFileInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (isLimitReached) {
      e.target.value = "";
      return;
    }
    if (e.target.files?.length) {
      await handleDocumentFiles(Array.from(e.target.files));
    }
    e.target.value = "";
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDropzoneDragOver(false);
    if (isLimitReached) return;
    if (e.dataTransfer.files?.length) {
      await handleDocumentFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isLimitReached) {
      setIsDropzoneDragOver(true);
    }
  };

  const handleDragLeave = () => {
    setIsDropzoneDragOver(false);
  };

  const openFilePicker = () => {
    if (!isLimitReached && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleNewVersionSelected = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file || !targetAssetForNewVersion) return;
    await uploadFile(file, targetAssetForNewVersion.kind, {
      targetAssetId: targetAssetForNewVersion.id,
    });
    setTargetAssetForNewVersion(null);
    if (versionUploadInputRef.current) {
      versionUploadInputRef.current.value = "";
    }
  };

  const triggerNewVersionUpload = (asset: Asset) => {
    setTargetAssetForNewVersion(asset);
    if (versionUploadInputRef.current) {
      versionUploadInputRef.current.value = "";
      versionUploadInputRef.current.click();
    }
  };

  const handleDownload = async (asset: Asset) => {
    const activeVersionId = getActiveVersionId(asset);
    await downloadAsset(asset.id, activeVersionId);
  };

  return (
    <div className="flex flex-col items-center text-center w-full max-w-2xl mx-auto gap-6">
      <input
        ref={versionUploadInputRef}
        type="file"
        className="hidden"
        onChange={handleNewVersionSelected}
      />

      <div className="flex justify-between items-center w-full px-1">
        <div>
          <Text as="h3" size="md" className="font-bold text-left">
            Slides & Documents
          </Text>
          <Text size="sm" className="text-left text-foreground/70">
            Upload pitch decks, business plans, or notes in PDF or PPTX format
            (up to 25 MB each).
          </Text>
        </div>
        <span className="text-sm px-3 py-1 rounded-full font-bold bg-primary/20 text-primary border border-primary/30 shrink-0">
          {documentAssets.length} / {maxDocuments} Documents
        </span>
      </div>

      <div className="flex flex-col gap-4 w-full text-left">
        {documentAssets.length > 0 && (
          <div className="flex flex-col gap-3">
            {documentAssets.map((doc, idx) => {
              const isRejected = doc.state === "rejected";
              const isVerifying = doc.state === "verifying";

              return (
                <Wrapper
                  key={doc.id}
                  className={cn(
                    "p-3.5 sm:p-4 rounded-2xl flex flex-col gap-3 cursor-pointer transition-colors",
                    selectedFileIndex === idx
                      ? "ring-1 ring-primary bg-primary/10"
                      : "hover:bg-foreground/5",
                  )}
                  onClick={() => setSelectedFileIndex(idx)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon
                        icon={
                          doc.file_name.endsWith(".pptx")
                            ? "tabler:presentation"
                            : "tabler:file-text"
                        }
                        className="text-2xl sm:text-3xl text-primary shrink-0"
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="text-base sm:text-lg font-semibold truncate text-foreground/90">
                          {doc.file_name}
                        </span>
                        <div className="flex items-center gap-2 text-sm sm:text-base text-foreground/60 ">
                          <span>{formatBytes(doc.size_bytes)}</span>
                          <span>•</span>
                          <span>
                            {new Date(doc.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div
                      className="flex items-center gap-2 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DocumentVersionSelector
                        versions={doc.versions}
                        selectedVersionId={getActiveVersionId(doc)}
                        onSelectVersion={(vId) =>
                          selectVersionForAsset(doc.id, vId)
                        }
                      />

                      {isVerifying && (
                        <span className="text-xs sm:text-sm px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 animate-pulse font-medium">
                          Verifying
                        </span>
                      )}

                      {isRejected && (
                        <span className="text-xs sm:text-sm px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 font-medium">
                          Rejected
                        </span>
                      )}
                    </div>
                  </div>

                  {isRejected && (
                    <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-300 flex items-start gap-2">
                      <Icon
                        icon="tabler:alert-triangle"
                        className="text-base shrink-0 mt-0.5 text-red-400"
                      />
                      <span>
                        {doc.rejection_reason || "Rejected by server"}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1.5 border-t border-foreground/5">
                    <Button
                      variant="glass"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(doc);
                      }}
                      className="text-sm px-3 py-1.5 h-8 font-medium"
                    >
                      <Icon icon="tabler:download" className="text-base" />
                      Download
                    </Button>
                    <Button
                      variant="glass"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerNewVersionUpload(doc);
                      }}
                      className="text-sm px-3 py-1.5 h-8 text-primary font-medium"
                    >
                      <Icon icon="tabler:upload" className="text-base" />
                      Version
                    </Button>
                  </div>
                </Wrapper>
              );
            })}
          </div>
        )}

        <div className="flex flex-col items-center justify-center w-full">
          <FileDropzone
            attachedFiles={attachedItems}
            currentSelectedFile={currentSelectedFile}
            isLimitReached={isLimitReached}
            isDropzoneDragOver={isDropzoneDragOver}
            fileInputRef={fileInputRef}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onFileInputChange={handleFileInputChange}
            onClick={openFilePicker}
          />
        </div>

        {fileError && (
          <Text
            size="xs"
            className="text-danger mt-1.5 font-medium text-center text-sm"
          >
            {fileError}
          </Text>
        )}

        <div className="flex flex-col items-center text-center mt-1 mb-2 text-sm text-foreground/60 leading-tight gap-3">
          <Text
            as="span"
            size="xs"
            className="text-foreground/70 text-center text-sm"
          >
            Supported formats: pdf, pptx (Max {maxDocuments} files, 25MB each)
          </Text>
          <UploadProgressList
            items={items}
            onRetry={retryUpload}
            onCancel={cancelUpload}
            onRemove={removeUploadItem}
          />
        </div>

        <div className="flex justify-between items-center text-sm text-foreground/60 px-1">
          <span>Supports versioning</span>
          <span className="text-primary font-semibold">
            Max {maxDocuments} per session
          </span>
        </div>
      </div>
    </div>
  );
}
