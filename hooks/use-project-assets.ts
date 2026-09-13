"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Asset, AssetFilterParams } from "@/lib/api/types";
import { apiClient } from "@/lib/api/client";

export interface UseProjectAssetsOptions {
  projectId: string;
  filters?: AssetFilterParams;
  enabled?: boolean;
}

export function useProjectAssets({
  projectId,
  filters,
  enabled = true,
}: UseProjectAssetsOptions) {
  const [selectedVersions, setSelectedVersions] = useState<Record<string, string>>({});

  const queryKey = useMemo(
    () =>
      filters
        ? ["projectAssets", projectId, filters]
        : ["projectAssets", projectId],
    [projectId, filters],
  );

  const {
    data: assetsPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => apiClient.getAssets(projectId, filters),
    enabled: enabled && !!projectId,
    refetchInterval: (query) => {
      const data = query.state.data;
      const hasPending = data?.items?.some(
        (a) => a.state === "verifying" || a.state === "pending_upload",
      );
      return hasPending ? 2000 : false;
    },
  });

  const assets: Asset[] = useMemo(() => {
    const rawItems = assetsPage?.items || [];

    return rawItems
      .filter((a) => {
        if (!a) return false;
        if (a.state !== "verified") return false;
        const size =
          a.size_bytes ??
          a.versions?.[a.versions.length - 1]?.size_bytes ??
          0;
        if (size <= 0) return false;
        return true;
      })
      .map((item) => ({
        ...item,
        size_bytes:
          item.size_bytes ??
          item.versions?.[item.versions.length - 1]?.size_bytes ??
          0,
      }));
  }, [assetsPage]);

  const presentationAsset = useMemo(
    () => assets.find((a) => a.kind === "presentation_video"),
    [assets],
  );

  const documentAssets = useMemo(
    () => assets.filter((a) => a.kind === "supporting_document"),
    [assets],
  );

  const audioAssets = useMemo(
    () => assets.filter((a) => a.kind === "answer_audio"),
    [assets],
  );

  const selectVersionForAsset = useCallback((assetId: string, versionId: string) => {
    setSelectedVersions((prev) => ({
      ...prev,
      [assetId]: versionId,
    }));
  }, []);

  const getActiveVersionId = useCallback(
    (asset: Asset): string | undefined => {
      if (selectedVersions[asset.id]) {
        return selectedVersions[asset.id];
      }
      if (asset.version_id) {
        return asset.version_id;
      }
      if (asset.versions && asset.versions.length > 0) {
        return asset.versions[asset.versions.length - 1].id;
      }
      return undefined;
    },
    [selectedVersions],
  );

  const downloadAsset = useCallback(
    async (assetId: string, versionId?: string) => {
      const intent = await apiClient.createDownloadIntent(assetId, versionId);
      if (typeof window !== "undefined" && intent.download_url) {
        const a = document.createElement("a");
        a.href = intent.download_url;
        a.download = intent.file_name;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    },
    [],
  );

  return {
    assets,
    presentationAsset,
    documentAssets,
    audioAssets,
    totalCount: assetsPage?.items?.length || assets.length,
    isLoading,
    isError,
    error,
    refetch,
    selectedVersions,
    selectVersionForAsset,
    getActiveVersionId,
    downloadAsset,
  };
}
