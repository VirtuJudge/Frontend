"use client";

import { useState, useRef } from "react";

export const MAX_FILES = 5;
export const MAX_FILE_SIZE = 25 * 1024 * 1024;
export const ALLOWED_EXTENSIONS = [".pdf", ".pptx"] as const;

export function isAllowedFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export function formatFileSize(bytes?: number | null): string {
  if (bytes == null || isNaN(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function useFileAttachments() {
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDropzoneDragOver, setIsDropzoneDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLimitReached = attachedFiles.length >= MAX_FILES;
  const currentSelectedFile =
    attachedFiles[selectedFileIndex] || attachedFiles[0];

  const handleAddFiles = (incoming: FileList | File[]) => {
    if (isLimitReached) {
      setFileError(`Maximum ${MAX_FILES} files allowed.`);
      return;
    }
    const filesArray = Array.from(incoming);
    if (filesArray.length === 0) return;

    let error: string | null = null;
    const validFiles: File[] = [];

    for (const file of filesArray) {
      if (!isAllowedFile(file)) {
        error = `Invalid format for "${file.name}". Supported: PDF, PPTX`;
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        error = `"${file.name}" exceeds the 25 MB limit (${formatFileSize(file.size)})`;
        continue;
      }

      const exists = attachedFiles.some(
        (f) => f.name === file.name && f.size === file.size,
      );
      if (exists) continue;

      validFiles.push(file);
    }

    if (attachedFiles.length + validFiles.length > MAX_FILES) {
      const allowedCount = Math.max(0, MAX_FILES - attachedFiles.length);
      if (allowedCount === 0) {
        setFileError(`Maximum ${MAX_FILES} files allowed.`);
        return;
      }
      validFiles.splice(allowedCount);
      error = `Maximum ${MAX_FILES} files allowed. Added ${allowedCount} file(s).`;
    }

    if (validFiles.length > 0) {
      setAttachedFiles((prev) => [...prev, ...validFiles]);
      setFileError(error);
    } else if (error) {
      setFileError(error);
    }
  };

  const handleDirectDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDropzoneDragOver(false);
    if (isLimitReached) {
      setFileError(`Maximum ${MAX_FILES} files allowed.`);
      return;
    }
    if (e.dataTransfer.files?.length) {
      handleAddFiles(e.dataTransfer.files);
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

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLimitReached) return;
    if (e.target.files?.length) {
      handleAddFiles(e.target.files);
    }
    e.target.value = "";
  };

  const handleRemoveFile = (indexToRemove: number) => {
    setAttachedFiles((prev) => {
      const updated = prev.filter((_, idx) => idx !== indexToRemove);
      if (selectedFileIndex >= updated.length) {
        setSelectedFileIndex(Math.max(0, updated.length - 1));
      }
      return updated;
    });
    setFileError(null);
  };

  const openFilePicker = () => {
    if (!isLimitReached) {
      fileInputRef.current?.click();
    }
  };

  return {
    attachedFiles,
    selectedFileIndex,
    setSelectedFileIndex,
    currentSelectedFile,
    isLimitReached,
    fileError,
    isDropzoneDragOver,
    fileInputRef,
    handleAddFiles,
    handleDirectDrop,
    handleDragOver,
    handleDragLeave,
    handleFileInputChange,
    handleRemoveFile,
    openFilePicker,
  };
}
