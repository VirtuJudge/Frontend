"use client";

import { useCallback, useRef } from "react";

/** Owns browser-media references and their release operations. */
export function useMediaResources() {
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const videoUrlRef = useRef<string | null>(null);

  const stopStream = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  }, []);

  const revokeVideoUrl = useCallback(() => {
    if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
    videoUrlRef.current = null;
  }, []);

  return {
    mediaStreamRef,
    mediaRecorderRef,
    liveVideoRef,
    recordedChunksRef,
    videoUrlRef,
    stopStream,
    revokeVideoUrl,
  };
}
