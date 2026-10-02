"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  AudioRecorderState,
  AudioRecordingError,
  AudioRecordingDraft,
} from "./audio-types";
import { useMediaStream } from "./use-media-stream";
import { parseMediaError } from "./audio-utils";

export type {
  AudioRecorderState,
  AudioRecorderErrorCode,
  AudioRecordingError,
  AudioRecordingDraft,
} from "./audio-types";

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
  const [durationMs, setDurationMs] = useState(0);
  const [draft, setDraft] = useState<AudioRecordingDraft | null>(null);

  const {
    mediaRecorderRef,
    canonicalMimeTypeRef,
    error: mediaError,
    setError: setMediaError,
    stopMediaStream,
    requestMediaStream,
    setupMediaRecorder,
  } = useMediaStream();

  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const accumulatedDurationRef = useRef(0);
  const segmentStartTimeRef = useRef(0);
  const draftUrlRef = useRef<string | null>(null);

  const stopTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
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
    setMediaError(null);
    if (state === "error") {
      setState("idle");
    }
  }, [state, setMediaError]);

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
  }, [cleanupDraftUrl, draft, maxDurationMs, onRecordingComplete, stopMediaStream, stopTimer, mediaRecorderRef, canonicalMimeTypeRef]);

  const startRecording = useCallback(async () => {
    cleanupDraftUrl();
    setDraft(null);
    setMediaError(null);
    setDurationMs(0);
    accumulatedDurationRef.current = 0;
    audioChunksRef.current = [];

    setState("requesting_permission");

    const stream = await requestMediaStream();
    if (!stream) {
      setState("error");
      return;
    }

    const recorder = setupMediaRecorder(stream);
    if (!recorder) {
      setState("error");
      return;
    }

    audioChunksRef.current = [];

    recorder.ondataavailable = (e: BlobEvent) => {
      if (e.data && e.data.size > 0) {
        audioChunksRef.current.push(e.data);
      }
    };

    recorder.onerror = () => {
      stopTimer();
      stopMediaStream();
      setMediaError({
        code: "recording_failed",
        message: "An unexpected error occurred during audio recording.",
      });
      setState("error");
    };

    segmentStartTimeRef.current = Date.now();
    accumulatedDurationRef.current = 0;

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
      recorder.start(250); 
      setState("recording");
    } catch (err) {
      stopTimer();
      stopMediaStream();
      setMediaError(parseMediaError(err));
      setState("error");
    }
  }, [
    cleanupDraftUrl,
    maxDurationMs,
    onMaxDurationReached,
    stopMediaStream,
    stopRecordingInternal,
    stopTimer,
    requestMediaStream,
    setupMediaRecorder,
    setMediaError,
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
  }, [stopTimer, mediaRecorderRef]);

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
  }, [maxDurationMs, onMaxDurationReached, stopRecordingInternal, mediaRecorderRef]);

  const stopRecording = useCallback(async () => {
    if (state === "recording") {
      accumulatedDurationRef.current += Date.now() - segmentStartTimeRef.current;
    }
    return stopRecordingInternal();
  }, [state, stopRecordingInternal]);

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
    error: mediaError,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    discardDraft,
    clearError,
  };
}
