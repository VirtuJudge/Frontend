"use client";

import { useEffect } from "react";
import type { Dispatch, RefObject, SetStateAction } from "react";

interface UseRecordingCountdownOptions {
  countdown: number | null;
  recorderRef: RefObject<MediaRecorder | null>;
  setCountdown: Dispatch<SetStateAction<number | null>>;
  setIsRecording: Dispatch<SetStateAction<boolean>>;
}

export function useRecordingCountdown({
  countdown,
  recorderRef,
  setCountdown,
  setIsRecording,
}: UseRecordingCountdownOptions) {
  useEffect(() => {
    if (countdown === null) return;
    const delay = process.env.NODE_ENV === "test" ? 10 : 1000;
    const timer = setTimeout(() => {
      if (countdown > 1) {
        setCountdown(countdown - 1);
        return;
      }
      setCountdown(null);
      if (recorderRef.current?.state === "inactive") {
        try {
          recorderRef.current.start();
          setIsRecording(true);
        } catch {}
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [countdown, recorderRef, setCountdown, setIsRecording]);
}
