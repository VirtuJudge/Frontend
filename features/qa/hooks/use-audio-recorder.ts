"use client";

import { useState, useRef, useCallback, useEffect } from "react";

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

export interface UseAudioRecorderOptions {
  /** Maximum recording duration in ms. Defaults to 120,000 ms (2 minutes). */
  maxDurationMs?: number;
  /** Warning threshold in ms. Defaults to 100,000 ms. */
  warningThresholdMs?: number;
  /** Callback fired when the max duration is reached and recording stops automatically. */
  onMaxDurationReached?: () => void;
  /** Callback fired when a recording completes and creates a draft. */
  onRecordingComplete?: (draft: AudioRecordingDraft) => void;
}

export interface UseAudioRecorderReturn {
  state: AudioRecorderState;
  isRecording: boolean;
  isPaused: boolean;
  hasDraft: boolean;
  draft: AudioRecordingDraft | null;
  durationMs: number;
  remainingMs: number;
  isNearingLimit: boolean;
  isAtLimit: boolean;
  error: AudioRecordingError | null;
  startRecording: () => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => Promise<AudioRecordingDraft | null>;
  discardDraft: () => void;
  clearError: () => void;
}

const DEFAULT_MAX_DURATION_MS = 120_000; // 2 minutes
const DEFAULT_WARNING_THRESHOLD_MS = 100_000; // 1 min 40 sec

/**
 * Determine supported audio MIME type and canonical container for the backend.
 * Accepted upload kinds for answer audio per contract:
 * audio/webm, audio/ogg, audio/mp4, audio/wav
 */
function getSupportedAudioMimeType(): { mimeType: string; canonicalType: string } {
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

function parseMediaError(err: unknown): AudioRecordingError {
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

export function useAudioRecorder(
  options: UseAudioRecorderOptions = {}
): UseAudioRecorderReturn {
  const {
    maxDurationMs = DEFAULT_MAX_DURATION_MS,
    warningThresholdMs = DEFAULT_WARNING_THRESHOLD_MS,
    onMaxDurationReached,
    onRecordingComplete,
  } = options;

  const [state, setState] = useState<AudioRecorderState>("idle");
  const [error, setError] = useState<AudioRecordingError | null>(null);
  const [durationMs, setDurationMs] = useState(0);
  const [draft, setDraft] = useState<AudioRecordingDraft | null>(null);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const accumulatedDurationRef = useRef(0);
  const segmentStartTimeRef = useRef(0);
  const draftUrlRef = useRef<string | null>(null);
  const canonicalMimeTypeRef = useRef<string>("audio/webm");

  const stopTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  const stopMediaStream = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      mediaStreamRef.current = null;
    }
  }, []);

  const cleanupDraftUrl = useCallback(() => {
    if (draftUrlRef.current) {
      URL.revokeObjectURL(draftUrlRef.current);
      draftUrlRef.current = null;
    }
  }, []);

  const discardDraft = useCallback(() => {
    cleanupDraftUrl();
    setDraft(null);
    setDurationMs(0);
    accumulatedDurationRef.current = 0;
    setState("idle");
  }, [cleanupDraftUrl]);

  const clearError = useCallback(() => {
    setError(null);
    if (state === "error") {
      setState("idle");
    }
  }, [state]);

  const stopRecordingInternal = useCallback(async (): Promise<AudioRecordingDraft | null> => {
    stopTimer();

    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      stopMediaStream();
      return draft;
    }

    return new Promise((resolve) => {
      recorder.onstop = () => {
        stopMediaStream();

        const chunks = audioChunksRef.current;
        const blob = new Blob(chunks, {
          type: canonicalMimeTypeRef.current || "audio/webm",
        });

        // Revoke previous URL if any
        cleanupDraftUrl();

        const url = URL.createObjectURL(blob);
        draftUrlRef.current = url;

        const finalDuration = Math.min(
          accumulatedDurationRef.current,
          maxDurationMs
        );

        const newDraft: AudioRecordingDraft = {
          blob,
          url,
          durationMs: finalDuration,
          mimeType: canonicalMimeTypeRef.current,
          sizeBytes: blob.size,
        };

        setDraft(newDraft);
        setDurationMs(finalDuration);
        setState("stopped");
        onRecordingComplete?.(newDraft);
        resolve(newDraft);
      };

      try {
        recorder.stop();
      } catch {
        stopMediaStream();
        setState("idle");
        resolve(null);
      }
    });
  }, [cleanupDraftUrl, draft, maxDurationMs, onRecordingComplete, stopMediaStream, stopTimer]);

  const startRecording = useCallback(async () => {
    // Check browser capability
    if (
      typeof window === "undefined" ||
      !navigator?.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      const err: AudioRecordingError = {
        code: "unsupported_browser",
        message:
          "Your web browser does not support audio recording. Please switch to a modern browser like Chrome, Edge, or Firefox.",
      };
      setError(err);
      setState("error");
      return;
    }

    // Clean up any existing draft before re-recording
    cleanupDraftUrl();
    setDraft(null);
    setError(null);
    setDurationMs(0);
    accumulatedDurationRef.current = 0;
    audioChunksRef.current = [];

    setState("requesting_permission");

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (err: unknown) {
      const parsed = parseMediaError(err);
      setError(parsed);
      setState("error");
      return;
    }

    mediaStreamRef.current = stream;

    const { mimeType, canonicalType } = getSupportedAudioMimeType();
    canonicalMimeTypeRef.current = canonicalType;

    let recorder: MediaRecorder;
    try {
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
      recorder = new MediaRecorder(stream, options);
    } catch (err: unknown) {
      try {
        recorder = new MediaRecorder(stream);
      } catch {
        stopMediaStream();
        const parsed = parseMediaError(err);
        setError(parsed);
        setState("error");
        return;
      }
    }

    mediaRecorderRef.current = recorder;
    audioChunksRef.current = [];

    recorder.ondataavailable = (e: BlobEvent) => {
      if (e.data && e.data.size > 0) {
        audioChunksRef.current.push(e.data);
      }
    };

    recorder.onerror = () => {
      stopTimer();
      stopMediaStream();
      setError({
        code: "recording_failed",
        message: "An unexpected error occurred during audio recording.",
      });
      setState("error");
    };

    segmentStartTimeRef.current = Date.now();
    accumulatedDurationRef.current = 0;

    // Start timer
    timerIntervalRef.current = setInterval(() => {
      const currentSegment = Date.now() - segmentStartTimeRef.current;
      const total = accumulatedDurationRef.current + currentSegment;

      if (total >= maxDurationMs) {
        setDurationMs(maxDurationMs);
        accumulatedDurationRef.current = maxDurationMs;
        onMaxDurationReached?.();
        stopRecordingInternal();
      } else {
        setDurationMs(total);
      }
    }, 100);

    try {
      recorder.start(250); // Collect in 250ms chunks
      setState("recording");
    } catch (err) {
      stopTimer();
      stopMediaStream();
      const parsed = parseMediaError(err);
      setError(parsed);
      setState("error");
    }
  }, [
    cleanupDraftUrl,
    maxDurationMs,
    onMaxDurationReached,
    stopMediaStream,
    stopRecordingInternal,
    stopTimer,
  ]);

  const pauseRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording") return;

    try {
      recorder.pause();
      stopTimer();
      accumulatedDurationRef.current += Date.now() - segmentStartTimeRef.current;
      setState("paused");
    } catch {
      // Ignore pause failure
    }
  }, [stopTimer]);

  const resumeRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "paused") return;

    try {
      recorder.resume();
      segmentStartTimeRef.current = Date.now();

      timerIntervalRef.current = setInterval(() => {
        const currentSegment = Date.now() - segmentStartTimeRef.current;
        const total = accumulatedDurationRef.current + currentSegment;

        if (total >= maxDurationMs) {
          setDurationMs(maxDurationMs);
          accumulatedDurationRef.current = maxDurationMs;
          onMaxDurationReached?.();
          stopRecordingInternal();
        } else {
          setDurationMs(total);
        }
      }, 100);

      setState("recording");
    } catch {
      // Ignore resume failure
    }
  }, [maxDurationMs, onMaxDurationReached, stopRecordingInternal]);

  const stopRecording = useCallback(async () => {
    if (state === "recording") {
      accumulatedDurationRef.current += Date.now() - segmentStartTimeRef.current;
    }
    return stopRecordingInternal();
  }, [state, stopRecordingInternal]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopTimer();
      stopMediaStream();
      cleanupDraftUrl();
    };
  }, [cleanupDraftUrl, stopMediaStream, stopTimer]);

  const remainingMs = Math.max(0, maxDurationMs - durationMs);
  const isNearingLimit = durationMs >= warningThresholdMs;
  const isAtLimit = durationMs >= maxDurationMs;

  return {
    state,
    isRecording: state === "recording",
    isPaused: state === "paused",
    hasDraft: !!draft,
    draft,
    durationMs,
    remainingMs,
    isNearingLimit,
    isAtLimit,
    error,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    discardDraft,
    clearError,
  };
}
