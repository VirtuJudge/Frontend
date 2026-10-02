export type AudioRecorderState =
  | "idle"
  | "requesting_permission"
  | "recording"
  | "paused"
  | "stopped"
  | "error";

export type AudioRecorderErrorCode =
  | "permission_denied"
  | "device_not_found"
  | "unsupported_browser"
  | "hardware_error"
  | "recording_failed";

export interface AudioRecordingError {
  code: AudioRecorderErrorCode;
  message: string;
}

export interface AudioRecordingDraft {
  blob: Blob;
  url: string;
  durationMs: number;
  mimeType: string;
  sizeBytes: number;
}
