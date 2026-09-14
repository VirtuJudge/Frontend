"use client";

import React, { useState } from "react";
import { Modal, Text, Button } from "@/components";
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!asset) return;
    setLoading(true);
    setError(null);
    try {
      await apiClient.deleteAsset(asset.id);
      onAssetDeleted?.();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete asset.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!asset) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!loading) {
          setError(null);
          onClose();
        }
      }}
      title="Delete Asset"
    >
      <div className="flex flex-col items-center gap-8 text-center my-4 max-w-lg">
        <Text
          size="sm"
          className="text-foreground/80 leading-relaxed text-center"
        >
          You are going to delete{" "}
          <span className="text-primary font-semibold">
            {asset.file_name}
          </span>{" "}
          from this project. Are you sure?
        </Text>

        {error && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger-lighter text-sm text-center w-full"
          >
            {error}
          </div>
        )}

        <div className="flex items-center justify-center gap-4">
          <Button
            variant="glass"
            size="sm"
            onClick={onClose}
            disabled={loading}
            className="rounded-full px-8 py-3"
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDelete}
            disabled={loading}
            loading={loading}
            className="rounded-full px-8 py-3 bg-[#e11d48] text-white font-bold"
            aria-label="Delete asset"
          >
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
}
