export interface UploadProgress {
  bytesUploaded: number;
  totalBytes: number;
  percentage: number;
}

export interface DirectUploadOptions {
  signedUrl: string;
  file: File | Blob;
  onProgress?: (progress: UploadProgress) => void;
}

export interface AudioRecordingResult {
  blob: Blob;
  durationMs: number;
  mimeType: string;
}
