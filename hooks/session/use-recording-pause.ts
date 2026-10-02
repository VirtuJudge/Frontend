"use client";

import { useCallback, useState } from "react";
import type { RefObject } from "react";

export function useRecordingPause(
  mediaStreamRef: RefObject<MediaStream | null>,
  mediaRecorderRef: RefObject<MediaRecorder | null>,
  isRecording: boolean,
) {
  const [isPaused, setIsPaused] = useState(false);
  const togglePause = useCallback((allowed: boolean) => {
    if (!allowed || !isRecording) return;
    setIsPaused((paused) => {
      const next = !paused;
      const recorder = mediaRecorderRef.current;
      if (next && recorder?.state === "recording") recorder.pause();
      if (!next && recorder?.state === "paused") recorder.resume();
      const stream = mediaStreamRef.current;
      const tracks = stream?.getVideoTracks?.() ?? stream?.getTracks?.() ?? [];
      tracks.forEach((track) => {
        track.enabled = !next;
      });
      return next;
    });
  }, [isRecording, mediaRecorderRef, mediaStreamRef]);
  return { isPaused, setIsPaused, togglePause };
}
