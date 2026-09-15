"use client";

import { useState, use, useMemo, useEffect } from "react";
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
  isAllowedFile,
  MAX_FILE_SIZE,
  formatFileSize,
} from "@/hooks";
import { Asset, AssetVersion } from "@/lib/api/types";
import { UploadProgressList } from "@/features/upload";
import { WorkspaceNavBar } from "@/components/Nav-Bar";
import { saveSessionConfig, getSessionConfig } from "@/lib/storage";

export default function PrepareSessionPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const router = useRouter();

  const savedConfig = useMemo(() => getSessionConfig(projectId), [projectId]);

  const [showTimer, setShowTimer] = useState(
    () => savedConfig?.showTimer ?? true,
  );
  const [allowPauses, setAllowPauses] = useState(
    () => savedConfig?.allowPauses ?? true,
  );
  const [isStarting, setIsStarting] = useState(false);

  const presentationTime = useDurationState(
    savedConfig?.presentationMinutes ?? 6,
    savedConfig?.presentationSeconds ?? 30,
  );
  const questionsTime = useDurationState(
    savedConfig?.questionsMinutes ?? 5,
    savedConfig?.questionsSeconds ?? 0,
  );

  const { documentAssets, refetch: refetchAssets } = useProjectAssets({
    projectId,
  });

  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>(
    () => savedConfig?.documentAssetIds ?? [],
  );
  const [selectedVersionIds, setSelectedVersionIds] = useState<
    Record<string, string>
  >(() => {
    if (savedConfig?.selectedAssets) {
      const verMap: Record<string, string> = {};
      for (const a of savedConfig.selectedAssets) {
        if (a.assetId && a.versionId) {
          verMap[a.assetId] = a.versionId;
        }
      }
      return verMap;
    }
    return {};
  });

  const [selectionNotice, setSelectionNotice] = useState<string | null>(null);

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
        prev.length < 5 && !prev.includes(asset.id)
          ? [...prev, asset.id]
          : prev,
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
      .slice(0, 5)
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
      if (!alreadyIncluded && files.length < 5) {
        files.push({
          id: `local-${f.name}-${f.size}`,
          name: f.name,
          size: f.size,
        });
      }
    }
    return files.slice(0, 5);
  }, [selectedProjectFiles, attachedFiles]);

  // Automatically sync configurations to localStorage whenever any setting changes
  useEffect(() => {
    const totalPresentationSec =
      presentationTime.minutes * 60 + presentationTime.seconds;
    const totalQuestionsSec =
      questionsTime.minutes * 60 + questionsTime.seconds;

    const selectedAssets = combinedFiles.map((f) => ({
      id: f.id,
      assetId: f.assetId,
      versionId: f.versionId,
      name: f.name,
      size: f.size,
      type: f.name.endsWith(".pdf")
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    }));

    const documentAssetIds = combinedFiles
      .map((f) => f.assetId)
      .filter((id): id is string => !!id);

    const documentVersionIds = combinedFiles
      .map((f) => f.versionId)
      .filter((id): id is string => !!id);

    saveSessionConfig(projectId, {
      projectId,
      showTimer,
      allowPauses,
      presentationDuration: totalPresentationSec,
      presentationMinutes: presentationTime.minutes,
      presentationSeconds: presentationTime.seconds,
      questionsDuration: totalQuestionsSec,
      questionsMinutes: questionsTime.minutes,
      questionsSeconds: questionsTime.seconds,
      selectedAssets,
      documentAssetIds,
      documentVersionIds,
    });
  }, [
    projectId,
    showTimer,
    allowPauses,
    presentationTime.minutes,
    presentationTime.seconds,
    questionsTime.minutes,
    questionsTime.seconds,
    combinedFiles,
  ]);

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
    setSelectionNotice(null);
  };

  const handleToggleProjectDocument = (doc: Asset) => {
    const isSelected = selectedAssetIds.includes(doc.id);
    if (isSelected) {
      setSelectedAssetIds((prev) => prev.filter((id) => id !== doc.id));
      setSelectionNotice(null);
    } else {
      if (combinedFiles.length >= 5) {
        setSelectionNotice("Maximum 5 files can be selected for a session.");
        return;
      }
      setSelectionNotice(null);
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

  const handleIncomingFiles = (incomingFiles: File[]) => {
    if (!incomingFiles.length) return;

    const invalidFormat = incomingFiles.find((f) => !isAllowedFile(f));
    if (invalidFormat) {
      setSelectionNotice(
        `Invalid format for "${invalidFormat.name}". Supported: PDF, PPTX`,
      );
      return;
    }
    const oversized = incomingFiles.find((f) => f.size > MAX_FILE_SIZE);
    if (oversized) {
      setSelectionNotice(
        `"${oversized.name}" exceeds the 25 MB limit (${formatFileSize(oversized.size)})`,
      );
      return;
    }

    const remainingSlots = Math.max(0, 5 - combinedFiles.length);
    const filesToSelect = incomingFiles.slice(0, remainingSlots);
    if (filesToSelect.length > 0) {
      handleAddFiles(filesToSelect);
    }

    if (incomingFiles.length > remainingSlots) {
      setSelectionNotice(
        "Maximum 5 files can be selected for a session. All files were uploaded to your project.",
      );
    } else {
      setSelectionNotice(null);
    }

    uploadFiles(incomingFiles, "supporting_document").catch(() => {});
  };

  const handleFileInputChangeWithUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (e.target.files?.length) {
      handleIncomingFiles(Array.from(e.target.files));
    }
    e.target.value = "";
  };

  const handleDirectDropWithUpload = (e: React.DragEvent) => {
    e.preventDefault();
    handleDragLeave();
    if (e.dataTransfer.files?.length) {
      handleIncomingFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleOpenPicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleDragOverAlways = (e: React.DragEvent) => {
    e.preventDefault();
    handleDragOver(e);
  };

  const handleStart = () => {
    setIsStarting(true);
    setTimeout(() => {
      setIsStarting(false);
      const totalPresentationSec =
        presentationTime.minutes * 60 + presentationTime.seconds;
      const totalQuestionsSec =
        questionsTime.minutes * 60 + questionsTime.seconds;

      const selectedAssets = combinedFiles.map((f) => ({
        id: f.id,
        assetId: f.assetId,
        versionId: f.versionId,
        name: f.name,
        size: f.size,
        type: f.name.endsWith(".pdf")
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      }));

      const documentAssetIds = combinedFiles
        .map((f) => f.assetId)
        .filter((id): id is string => !!id);

      const documentVersionIds = combinedFiles
        .map((f) => f.versionId)
        .filter((id): id is string => !!id);

      // Save complete session configuration to localStorage under projectId
      saveSessionConfig(projectId, {
        projectId,
        showTimer,
        allowPauses,
        presentationDuration: totalPresentationSec,
        presentationMinutes: presentationTime.minutes,
        presentationSeconds: presentationTime.seconds,
        questionsDuration: totalQuestionsSec,
        questionsMinutes: questionsTime.minutes,
        questionsSeconds: questionsTime.seconds,
        selectedAssets,
        documentAssetIds,
        documentVersionIds,
      });

      try {
        sessionStorage.setItem(
          `session_config_${projectId}`,
          JSON.stringify({
            projectId,
            timer: showTimer,
            pause: allowPauses,
            presentationDuration: totalPresentationSec,
            questionsDuration: totalQuestionsSec,
            documentAssetIds,
            documentVersionIds,
            attachedFiles: selectedAssets,
            selectedFileIndex,
          }),
        );
      } catch {}

      router.push(`/projects/${projectId}/session/record`);
    }, 500);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full gap-10 pt-20 lg:pt-0">
      <WorkspaceNavBar />
      <Text
        size="lg"
        className="font-bold tracking-tight text-fg text-center"
      >
        Configure Session Settings
      </Text>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-start justify-items-center gap-10 md:gap-14 lg:gap-20 w-full max-w-5xl mx-auto">
        <div className="flex flex-col gap-7 justify-center w-full max-w-60">
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
            isDropzoneDragOver={isDropzoneDragOver}
            fileInputRef={fileInputRef}
            onDrop={handleDirectDropWithUpload}
            onDragOver={handleDragOverAlways}
            onDragLeave={handleDragLeave}
            onFileInputChange={handleFileInputChangeWithUpload}
            onClick={handleOpenPicker}
          />

          {(fileError || selectionNotice) && (
            <Text
              size="xs"
              className="text-danger mt-1.5 font-medium text-center text-sm"
            >
              {fileError || selectionNotice}
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
