import { Asset } from "@/lib/api/types";

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
