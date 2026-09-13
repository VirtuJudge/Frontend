"use client";

import { useState, use, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Text,
  ToggleSwitch,
  DurationPicker,
  UploadedFilesDropdown,
  FileDropzone,
} from "@/components";
import {
  useFileAttachments,
  useDurationState,
  useProjectAssets,
  useDirectUpload,
} from "@/hooks";
import { Asset, AssetVersion } from "@/lib/api/types";
import { UploadProgressList } from "@/features/upload";
import { WorkspaceNavBar } from "@/components/Nav-Bar";

export default function PrepareSessionPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const router = useRouter();

  const [discussionPanel, setDiscussionPanel] = useState(true);
  const [showTimer, setShowTimer] = useState(true);
  const [allowPauses, setAllowPauses] = useState(true);
  const [isStarting, setIsStarting] = useState(false);

  const presentationTime = useDurationState(6, 30);
  const questionsTime = useDurationState(5, 0);

  const { documentAssets, refetch: refetchAssets } = useProjectAssets({
    projectId,
  });

  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [selectedVersionIds, setSelectedVersionIds] = useState<
    Record<string, string>
  >({});

  const {
    items: uploadItems,
    uploadFiles,
    retryUpload,
    cancelUpload,
    removeUploadItem,
  } = useDirectUpload({
    projectId,
    onUploadSuccess: (asset) => {
      refetchAssets();
      setSelectedAssetIds((prev) =>
        prev.includes(asset.id) ? prev : [...prev, asset.id],
      );
      if (asset.version_id) {
        setSelectedVersionIds((prev) => ({
          ...prev,
          [asset.id]: asset.version_id!,
        }));
      }
    },
  });

  const {
    attachedFiles,
    selectedFileIndex,
    setSelectedFileIndex,
    fileError,
    isDropzoneDragOver,
    fileInputRef,
    handleAddFiles,
    handleDragOver,
    handleDragLeave,
    handleRemoveFile,
  } = useFileAttachments();

  const selectedProjectFiles = useMemo(() => {
    return selectedAssetIds
      .map((id) => documentAssets.find((a) => a.id === id))
      .filter((a): a is Asset => !!a)
      .map((asset) => ({
        id: asset.id,
        assetId: asset.id,
        name: asset.file_name,
        size: asset.size_bytes,
        versionId:
          selectedVersionIds[asset.id] ||
          asset.version_id ||
          asset.versions?.[asset.versions.length - 1]?.id,
        versions: asset.versions,
      }));
  }, [selectedAssetIds, documentAssets, selectedVersionIds]);

  const combinedFiles = useMemo(() => {
    const files: Array<{
      id: string;
      name: string;
      size: number;
      assetId?: string;
      versionId?: string;
      versions?: AssetVersion[];
    }> = [...selectedProjectFiles];
    for (const f of attachedFiles) {
      const alreadyIncluded = files.some(
        (item) => item.name === f.name && item.size === f.size,
      );
      if (!alreadyIncluded) {
        files.push({
          id: `local-${f.name}-${f.size}`,
          name: f.name,
          size: f.size,
        });
      }
    }
    return files;
  }, [selectedProjectFiles, attachedFiles]);

  const totalSessionCount = combinedFiles.length;
  const isProjectFilesLimitReached = documentAssets.length >= 5;
  const isLimitReached = totalSessionCount >= 5 || isProjectFilesLimitReached;
  const currentSelectedFile =
    combinedFiles[selectedFileIndex] || combinedFiles[combinedFiles.length - 1];

  const handleRemoveSessionFile = (idx: number) => {
    const itemToRemove = combinedFiles[idx];
    if (!itemToRemove) return;
    if (itemToRemove.assetId) {
      setSelectedAssetIds((prev) =>
        prev.filter((id) => id !== itemToRemove.assetId),
      );
    }
    const attachedIdx = attachedFiles.findIndex(
      (f) => f.name === itemToRemove.name && f.size === itemToRemove.size,
    );
    if (attachedIdx !== -1) {
      handleRemoveFile(attachedIdx);
    }
    if (selectedFileIndex >= combinedFiles.length - 1) {
      setSelectedFileIndex(Math.max(0, combinedFiles.length - 2));
    }
  };

  const handleToggleProjectDocument = (doc: Asset) => {
    const isSelected = selectedAssetIds.includes(doc.id);
    if (isSelected) {
      setSelectedAssetIds((prev) => prev.filter((id) => id !== doc.id));
    } else {
      if (totalSessionCount >= 5) {
        return;
      }
      setSelectedAssetIds((prev) => [...prev, doc.id]);
      if (!selectedVersionIds[doc.id]) {
        const verId =
          doc.version_id || doc.versions?.[doc.versions.length - 1]?.id;
        if (verId) {
          setSelectedVersionIds((prev) => ({ ...prev, [doc.id]: verId }));
        }
      }
    }
  };

  const handleSelectVersion = (assetId: string, versionId: string) => {
    setSelectedVersionIds((prev) => ({
      ...prev,
      [assetId]: versionId,
    }));
  };

  const handleFileInputChangeWithUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (isLimitReached) {
      e.target.value = "";
      return;
    }
    if (e.target.files?.length) {
      const files = Array.from(e.target.files);
      handleAddFiles(files);
      const remainingSlots = Math.max(0, 5 - documentAssets.length);
      const toUpload = files.slice(0, remainingSlots);
      if (toUpload.length > 0) {
        uploadFiles(toUpload, "supporting_document").catch(() => {});
      }
    }
    e.target.value = "";
  };

  const handleDirectDropWithUpload = (e: React.DragEvent) => {
    e.preventDefault();
    handleDragLeave();
    if (isLimitReached) return;
    if (e.dataTransfer.files?.length) {
      const files = Array.from(e.dataTransfer.files);
      handleAddFiles(files);
      const remainingSlots = Math.max(0, 5 - documentAssets.length);
      const toUpload = files.slice(0, remainingSlots);
      if (toUpload.length > 0) {
        uploadFiles(toUpload, "supporting_document").catch(() => {});
      }
    }
  };

  const handleOpenPicker = () => {
    if (!isLimitReached && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleDragOverWithLimit = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isLimitReached) {
      handleDragOver(e);
    }
  };

  const handleStart = () => {
    setIsStarting(true);
    setTimeout(() => {
      setIsStarting(false);
      const totalPresentationSec =
        presentationTime.minutes * 60 + presentationTime.seconds;
      const totalQuestionsSec =
        questionsTime.minutes * 60 + questionsTime.seconds;

      const config = {
        projectId,
        timer: showTimer,
        pause: allowPauses,
        panel: discussionPanel,
        presentationDuration: totalPresentationSec,
        questionsDuration: totalQuestionsSec,
        documentAssetIds: combinedFiles
          .map((f) => f.assetId)
          .filter((id): id is string => !!id),
        documentVersionIds: combinedFiles
          .map((f) => f.versionId)
          .filter((id): id is string => !!id),
        attachedFiles: combinedFiles.map((f) => ({
          name: f.name,
          size: f.size,
          type: f.name.endsWith(".pdf")
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          assetId: f.assetId,
          versionId: f.versionId,
        })),
        selectedFileIndex,
      };

      try {
        sessionStorage.setItem(
          `session_config_${projectId}`,
          JSON.stringify(config),
        );
      } catch {}

      const query = new URLSearchParams({
        timer: String(showTimer),
        pause: String(allowPauses),
        panel: String(discussionPanel),
        duration: String(totalPresentationSec),
        questionsDuration: String(totalQuestionsSec),
      });
      if (config.documentAssetIds.length > 0) {
        query.set("documentAssetIds", config.documentAssetIds.join(","));
      }
      if (config.documentVersionIds.length > 0) {
        query.set("documentVersionIds", config.documentVersionIds.join(","));
      }
      router.push(`/projects/${projectId}/session/record?${query.toString()}`);
    }, 500);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-[calc(100vh-220px)] px-4 py-6 gap-10">
      <WorkspaceNavBar />
      <Text
        size="lg"
        className="font-bold tracking-tight text-fg text-center sm:mb-2"
      >
        Configure Session Settings
      </Text>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-start justify-items-center gap-10 md:gap-14 lg:gap-20 w-full max-w-5xl mx-auto">
        <div className="flex flex-col gap-7 justify-center w-full max-w-60">
          <ToggleSwitch
            checked={discussionPanel}
            onChange={setDiscussionPanel}
            label="Discussion panel"
          />
          <ToggleSwitch
            checked={showTimer}
            onChange={setShowTimer}
            label="Show timer"
          />
          <ToggleSwitch
            checked={allowPauses}
            onChange={setAllowPauses}
            label="Allow pauses"
          />
        </div>

        <div className="flex flex-col items-center text-center w-full max-w-80 gap-5">
          <UploadedFilesDropdown
            attachedFiles={combinedFiles}
            selectedFileIndex={selectedFileIndex}
            currentSelectedFile={currentSelectedFile}
            onSelectFile={setSelectedFileIndex}
            onRemoveFile={handleRemoveSessionFile}
            projectDocuments={documentAssets}
            selectedAssetIds={selectedAssetIds}
            selectedVersionIds={selectedVersionIds}
            onToggleProjectDocument={handleToggleProjectDocument}
            onSelectVersion={handleSelectVersion}
          />

          <FileDropzone
            attachedFiles={combinedFiles}
            currentSelectedFile={currentSelectedFile}
            isLimitReached={isLimitReached}
            isDropzoneDragOver={isDropzoneDragOver}
            fileInputRef={fileInputRef}
            onDrop={handleDirectDropWithUpload}
            onDragOver={handleDragOverWithLimit}
            onDragLeave={handleDragLeave}
            onFileInputChange={handleFileInputChangeWithUpload}
            onClick={handleOpenPicker}
          />

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
              Supported formats: pdf, pptx (Max 5 files, 25MB each)
            </Text>
            <UploadProgressList
              items={uploadItems}
              onRetry={retryUpload}
              onCancel={cancelUpload}
              onRemove={removeUploadItem}
            />
          </div>
        </div>

        <div className="flex flex-col gap-8 justify-self-center md:justify-self-start w-full max-w-60">
          <DurationPicker
            label="Presentation time"
            minutes={presentationTime.minutes}
            seconds={presentationTime.seconds}
            onMinutesChange={presentationTime.setMinutes}
            onSecondsChange={presentationTime.setSeconds}
          />

          <DurationPicker
            label="Questions time"
            minutes={questionsTime.minutes}
            seconds={questionsTime.seconds}
            onMinutesChange={questionsTime.setMinutes}
            onSecondsChange={questionsTime.setSeconds}
          />
        </div>
      </div>
      <Button
        variant="primary"
        size="default"
        loading={isStarting}
        onClick={handleStart}
        className="rounded-full px-20 sm:px-28 h-14 text-xl sm:text-2xl font-bold shadow-lg shadow-primary/20"
      >
        Start
      </Button>
    </div>
  );
}
