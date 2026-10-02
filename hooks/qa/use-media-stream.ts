import { useState, useCallback, useRef, useEffect } from "react";
import { parseMediaError, getSupportedAudioMimeType } from "./audio-utils";
import { AudioRecordingError } from "./audio-types";

export function useMediaStream() {
  const [error, setError] = useState<AudioRecordingError | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const canonicalMimeTypeRef = useRef<string>("audio/webm");

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

  const requestMediaStream = useCallback(async () => {
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
      return null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;
      return stream;
    } catch (err: unknown) {
      setError(parseMediaError(err));
      return null;
    }
  }, []);

  const setupMediaRecorder = useCallback((stream: MediaStream) => {
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
        setError(parseMediaError(err));
        return null;
      }
    }
    mediaRecorderRef.current = recorder;
    return recorder;
  }, [stopMediaStream]);

  useEffect(() => {
    return () => {
      stopMediaStream();
    };
  }, [stopMediaStream]);

  return {
    mediaStreamRef,
    mediaRecorderRef,
    canonicalMimeTypeRef,
    error,
    setError,
    stopMediaStream,
    requestMediaStream,
    setupMediaRecorder
  };
}
