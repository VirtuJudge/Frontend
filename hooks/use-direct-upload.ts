"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Asset, AssetKind } from "@/lib/api/types";
import { apiClient } from "@/lib/api/client";
import {
  validateFile,
  computeFileChecksum,
  uploadFileDirectly,
  generateIdempotencyKey,
} from "@/lib/upload";

export type UploadStage =
  | "idle"
  | "validating"
  | "hashing"
  | "requesting_intent"
  | "uploading"
  | "completing"
  | "verifying"
  | "verified"
  | "error"
  | "rejected";

export interface UploadItem {
  id: string;
  file: File;
  kind: AssetKind;
  stage: UploadStage;
  progress: number;
  hashProgress: number;
  checksumSha256?: string;
  assetId?: string;
  versionId?: string;
  error?: string;
  rejectionReason?: string;
  durationMs?: number;
  targetAssetId?: string;
}

export interface UseDirectUploadOptions {
  projectId: string;
  onUploadSuccess?: (asset: Asset) => void;
  onUploadError?: (error: Error, item: UploadItem) => void;
  maxPollAttempts?: number;
  pollIntervalMs?: number;
}

export function useDirectUpload({
  projectId,
  onUploadSuccess,
  onUploadError,
  maxPollAttempts = 20,
  pollIntervalMs = 1500,
}: UseDirectUploadOptions) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  useEffect(() => {
    const controllers = abortControllersRef.current;
    return () => {
      controllers.forEach((ctrl) => ctrl.abort());
      controllers.clear();
    };
  }, []);

  const updateItem = useCallback(
    (id: string, updates: Partial<UploadItem>) => {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...updates } : item)),
      );
    },
    [],
  );

  const pollAssetVerification = useCallback(
    async (assetId: string, itemId: string): Promise<Asset | null> => {
      let attempts = 0;
      while (attempts < maxPollAttempts) {
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
        try {
          const asset = await apiClient.getAsset(assetId);
          if (asset.state === "verified") {
            updateItem(itemId, {
              stage: "verified",
              progress: 100,
              rejectionReason: undefined,
            });
            onUploadSuccess?.(asset);
            return asset;
          }
          if (asset.state === "rejected") {
            const reason =
              asset.rejection_reason || "Verification rejected by server";
            updateItem(itemId, {
              stage: "rejected",
              rejectionReason: reason,
              error: reason,
            });
            return null;
          }
        } catch {
        }
        attempts += 1;
      }
      return null;
    },
    [maxPollAttempts, pollIntervalMs, updateItem, onUploadSuccess],
  );

  const startUploadForItem = useCallback(
    async (
      itemId: string,
      file: File,
      kind: AssetKind,
      durationMs?: number,
      targetAssetId?: string,
    ): Promise<Asset | null> => {
      const abortController = new AbortController();
      abortControllersRef.current.set(itemId, abortController);

      updateItem(itemId, {
        stage: "validating",
        progress: 0,
        hashProgress: 0,
        error: undefined,
        rejectionReason: undefined,
      });

      const validation = validateFile(file, kind, durationMs);
      if (!validation.valid) {
        const errorMsg = validation.error || "File validation failed";
        updateItem(itemId, {
          stage: "error",
          error: errorMsg,
        });
        const currentItem: UploadItem = {
          id: itemId,
          file,
          kind,
          stage: "error",
          progress: 0,
          hashProgress: 0,
          error: errorMsg,
          durationMs,
          targetAssetId,
        };
        onUploadError?.(new Error(errorMsg), currentItem);
        return null;
      }

      updateItem(itemId, { stage: "hashing" });
      let checksum = "";
      try {
        checksum = await computeFileChecksum(file, (pct: number) => {
          updateItem(itemId, { hashProgress: pct });
        });
        updateItem(itemId, { checksumSha256: checksum, hashProgress: 100 });
      } catch (err) {
        const errorMsg =
          err instanceof Error
            ? `Checksum error: ${err.message}`
            : "Failed to calculate checksum";
        updateItem(itemId, { stage: "error", error: errorMsg });
        return null;
      }

      if (abortController.signal.aborted) return null;

      updateItem(itemId, { stage: "requesting_intent" });
      const idempotencyKey = generateIdempotencyKey("intent");

      let uploadIntent;
      try {
        if (targetAssetId) {
          uploadIntent = await apiClient.createVersionUploadIntent(
            targetAssetId,
            {
              file_name: file.name,
              declared_media_type:
                file.type ||
                (kind === "presentation_video"
                  ? "video/mp4"
                  : "application/pdf"),
              declared_size_bytes: file.size,
            },
            idempotencyKey,
          );
        } else {
          uploadIntent = await apiClient.createUploadIntent(
            projectId,
            {
              file_name: file.name,
              declared_media_type:
                file.type ||
                (kind === "presentation_video"
                  ? "video/mp4"
                  : "application/pdf"),
              declared_size_bytes: file.size,
              kind,
            },
            idempotencyKey,
          );
        }
        updateItem(itemId, {
          assetId: uploadIntent.asset_id,
          versionId: uploadIntent.version_id,
        });
      } catch (err) {
        const errorMsg =
          err instanceof Error
            ? err.message
            : "Failed to request upload intent";
        updateItem(itemId, { stage: "error", error: errorMsg });
        return null;
      }

      if (abortController.signal.aborted) return null;

      updateItem(itemId, { stage: "uploading", progress: 0 });
      try {
        await uploadFileDirectly({
          uploadUrl: uploadIntent.upload_url,
          file,
          headers: uploadIntent.required_headers,
          onProgress: (p) => updateItem(itemId, { progress: p.percentage }),
          signal: abortController.signal,
        });
      } catch (err) {
        if (abortController.signal.aborted) {
          updateItem(itemId, { stage: "error", error: "Upload cancelled" });
          return null;
        }
        const errorMsg =
          err instanceof Error ? err.message : "Failed to upload file";
        updateItem(itemId, { stage: "error", error: errorMsg });
        return null;
      }

      if (abortController.signal.aborted) return null;

      updateItem(itemId, { stage: "completing" });
      try {
        await apiClient.completeUpload(
          uploadIntent.asset_id,
          uploadIntent.version_id,
          { checksum, size_bytes: file.size },
        );
      } catch (err) {
        const errorMsg =
          err instanceof Error
            ? err.message
            : "Failed to finalize upload on backend";
        updateItem(itemId, { stage: "error", error: errorMsg });
        return null;
      }

      updateItem(itemId, { stage: "verifying" });
      return await pollAssetVerification(uploadIntent.asset_id, itemId);
    },
    [
      projectId,
      updateItem,
      onUploadError,
      pollAssetVerification,
    ],
  );

  const uploadFile = useCallback(
    async (
      file: File,
      kind: AssetKind,
      options?: { durationMs?: number; targetAssetId?: string },
    ): Promise<Asset | null> => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const newItem: UploadItem = {
        id,
        file,
        kind,
        stage: "idle",
        progress: 0,
        hashProgress: 0,
        durationMs: options?.durationMs,
        targetAssetId: options?.targetAssetId,
      };

      setItems((prev) => [...prev, newItem]);
      return await startUploadForItem(
        id,
        file,
        kind,
        options?.durationMs,
        options?.targetAssetId,
      );
    },
    [startUploadForItem],
  );

  const uploadFiles = useCallback(
    async (files: File[], kind: AssetKind): Promise<Asset[]> => {
      const results: Asset[] = [];
      for (const file of files) {
        const asset = await uploadFile(file, kind);
        if (asset) results.push(asset);
      }
      return results;
    },
    [uploadFile],
  );

  const retryUpload = useCallback(
    async (id: string): Promise<Asset | null> => {
      const item = items.find((i) => i.id === id);
      if (!item) return null;
      return await startUploadForItem(
        id,
        item.file,
        item.kind,
        item.durationMs,
        item.targetAssetId,
      );
    },
    [items, startUploadForItem],
  );

  const cancelUpload = useCallback(
    (id: string) => {
      const controller = abortControllersRef.current.get(id);
      if (controller) {
        controller.abort();
        abortControllersRef.current.delete(id);
      }
      updateItem(id, { stage: "error", error: "Upload cancelled by user" });
    },
    [updateItem],
  );

  const removeUploadItem = useCallback((id: string) => {
    const controller = abortControllersRef.current.get(id);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(id);
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clearCompleted = useCallback(() => {
    setItems((prev) =>
      prev.filter(
        (i) => i.stage !== "verified" && i.stage !== "error" && i.stage !== "rejected",
      ),
    );
  }, []);

  const isUploading = items.some(
    (i) =>
      i.stage === "validating" ||
      i.stage === "hashing" ||
      i.stage === "requesting_intent" ||
      i.stage === "uploading" ||
      i.stage === "completing" ||
      i.stage === "verifying",
  );

  return {
    items,
    isUploading,
    uploadFile,
    uploadFiles,
    retryUpload,
    cancelUpload,
    removeUploadItem,
    clearCompleted,
  };
}
