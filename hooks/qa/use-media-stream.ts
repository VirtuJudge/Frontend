import { useState, useCallback, useRef, useEffect } from "react";
import { parseMediaError, getSupportedAudioMimeType } from "./audio-utils";
import { AudioRecordingError } from "./audio-types";

export function useMediaStream() {
  const [error, setError] = useState<AudioRecordingError | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const canonicalMimeTypeRef = useRef<string>("audio/webm");
  const isMountedRef = useRef(true);
  const activeRequestIdRef = useRef(0);

  const stopMediaStream = useCallback(() => {
    activeRequestIdRef.current += 1;
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
    const requestId = ++activeRequestIdRef.current;

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
      if (isMountedRef.current && requestId === activeRequestIdRef.current) {
        setError(err);
      }
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

      if (!isMountedRef.current || requestId !== activeRequestIdRef.current) {
        stream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {
            // ignore
          }
        });
        return null;
      }

      // Stop any existing stream before replacing
      if (mediaStreamRef.current && mediaStreamRef.current !== stream) {
        mediaStreamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {
            // ignore
          }
        });
      }

      mediaStreamRef.current = stream;
      return stream;
    } catch (err: unknown) {
      if (!isMountedRef.current || requestId !== activeRequestIdRef.current) {
        return null;
      }
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
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
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
