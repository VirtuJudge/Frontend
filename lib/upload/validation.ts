import { AssetKind } from "@/lib/api/types";

export interface ValidationRule {
  maxSizeBytes: number;
  allowedExtensions: readonly string[];
  allowedMimeTypes: readonly string[];
  maxDurationMs?: number;
}

export const UPLOAD_RULES: Record<AssetKind, ValidationRule> = {
  presentation_video: {
    maxSizeBytes: 500 * 1024 * 1024,
    allowedExtensions: [".mp4", ".webm"],
    allowedMimeTypes: ["video/mp4", "video/webm"],
    maxDurationMs: 10 * 60 * 1000,
  },
  supporting_document: {
    maxSizeBytes: 25 * 1024 * 1024,
    allowedExtensions: [".pdf", ".pptx"],
    allowedMimeTypes: [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ],
  },
  answer_audio: {
    maxSizeBytes: 50 * 1024 * 1024,
    allowedExtensions: [".webm", ".mp4", ".wav", ".mp3", ".ogg"],
    allowedMimeTypes: [
      "audio/webm",
      "audio/mp4",
      "audio/wav",
      "audio/mpeg",
      "audio/ogg",
    ],
    maxDurationMs: 2 * 60 * 1000,
  },
  report_pdf: {
    maxSizeBytes: 50 * 1024 * 1024,
    allowedExtensions: [".pdf"],
    allowedMimeTypes: ["application/pdf"],
  },
};

export interface ValidationResult {
  valid: boolean;
  error?: string;
  code?: "FILE_TOO_LARGE" | "UNSUPPORTED_TYPE" | "DURATION_EXCEEDED" | "EMPTY_FILE";
}

export function formatBytes(bytes?: number | null): string {
  if (bytes == null || isNaN(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    const kb = (bytes / 1024).toFixed(1);
    return `${kb.endsWith(".0") ? kb.slice(0, -2) : kb} KB`;
  }
  const mb = (bytes / (1024 * 1024)).toFixed(1);
  return `${mb.endsWith(".0") ? mb.slice(0, -2) : mb} MB`;
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

export function validateFile(
  file: File,
  kind: AssetKind,
  durationMs?: number,
): ValidationResult {
  if (file.size === 0) {
    return {
      valid: false,
      code: "EMPTY_FILE",
      error: `"${file.name}" is empty and cannot be uploaded.`,
    };
  }

  const rules = UPLOAD_RULES[kind];
  if (file.size > rules.maxSizeBytes) {
    return {
      valid: false,
      code: "FILE_TOO_LARGE",
      error: `"${file.name}" exceeds the maximum allowed size of ${formatBytes(rules.maxSizeBytes)} (actual: ${formatBytes(file.size)}).`,
    };
  }

  const fileNameLower = file.name.toLowerCase();
  const hasValidExtension = rules.allowedExtensions.some((ext) =>
    fileNameLower.endsWith(ext),
  );

  if (!hasValidExtension) {
    return {
      valid: false,
      code: "UNSUPPORTED_TYPE",
      error: `"${file.name}" has an unsupported format. Allowed formats: ${rules.allowedExtensions.join(", ")}.`,
    };
  }

  if (
    durationMs !== undefined &&
    rules.maxDurationMs !== undefined &&
    durationMs > rules.maxDurationMs
  ) {
    return {
      valid: false,
      code: "DURATION_EXCEEDED",
      error: `"${file.name}" exceeds maximum duration of ${formatDuration(rules.maxDurationMs)} (actual: ${formatDuration(durationMs)}).`,
    };
  }

  return { valid: true };
}

export function resolveMediaType(file: File, kind: AssetKind): string {
  if (file.type && file.type.length > 0) {
    return file.type;
  }
  const name = file.name.toLowerCase();
  if (name.endsWith(".mp4")) return "video/mp4";
  if (name.endsWith(".webm")) return kind === "presentation_video" ? "video/webm" : "audio/webm";
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".pptx")) return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  if (name.endsWith(".wav")) return "audio/wav";
  if (name.endsWith(".mp3")) return "audio/mpeg";
  if (name.endsWith(".ogg")) return "audio/ogg";
  return "application/octet-stream";
}
