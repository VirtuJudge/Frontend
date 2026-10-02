"use client";

import React from "react";
import { ConfirmActionModal } from "@/components";
import { Asset } from "@/lib/api/types";
import { apiClient } from "@/lib/api/client";

export interface DeleteAssetModalProps {
  asset: Asset | null;
  isOpen: boolean;
  onClose: () => void;
  onAssetDeleted?: () => void;
}

export function DeleteAssetModal({
  asset,
  isOpen,
  onClose,
  onAssetDeleted,
}: DeleteAssetModalProps) {
  if (!asset) return null;

  return (
    <ConfirmActionModal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Asset"
      confirmLabel="Delete"
      confirmAriaLabel="Delete asset"
      errorMessage="Failed to delete asset."
      description={<>You are going to delete <span className="font-semibold text-primary">{asset.file_name}</span> from this project. Are you sure?</>}
      onConfirm={async () => {
        await apiClient.deleteAsset(asset.id);
        onAssetDeleted?.();
      }}
    />
  );
}
