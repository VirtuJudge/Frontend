import { AudioRecordingError } from "./audio-types";

export function getSupportedAudioMimeType(): { mimeType: string; canonicalType: string } {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    return { mimeType: "", canonicalType: "audio/webm" };
  }

  const candidates = [
    { mimeType: "audio/webm;codecs=opus", canonicalType: "audio/webm" },
    { mimeType: "audio/webm", canonicalType: "audio/webm" },
    { mimeType: "audio/ogg;codecs=opus", canonicalType: "audio/ogg" },
    { mimeType: "audio/ogg", canonicalType: "audio/ogg" },
    { mimeType: "audio/mp4", canonicalType: "audio/mp4" },
    { mimeType: "audio/wav", canonicalType: "audio/wav" },
  ];

  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(candidate.mimeType)) {
      return candidate;
    }
  }

  return { mimeType: "", canonicalType: "audio/webm" };
}

export function parseMediaError(err: unknown): AudioRecordingError {
  if (err instanceof Error) {
    if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
      return {
        code: "permission_denied",
        message: "Microphone access was denied. Please allow microphone permissions in your browser settings to record your answer.",
      };
    }
    if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
      return {
        code: "device_not_found",
        message: "No microphone was found on this device. Please connect a microphone and try again.",
      };
    }
    if (err.name === "NotReadableError" || err.name === "TrackStartError") {
      return {
        code: "hardware_error",
        message: "Your microphone is busy or locked by another application. Please free the device and try again.",
      };
    }
    return {
      code: "recording_failed",
      message: err.message || "Failed to access microphone. Please try again.",
    };
  }
  return {
    code: "recording_failed",
    message: "An unknown error occurred while recording audio.",
  };
}
