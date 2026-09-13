"use client";

import { useState, useEffect, useCallback } from "react";

export function formatCountdown(totalSec: number) {
  const mins = Math.max(0, Math.floor(totalSec / 60));
  const secs = Math.max(0, totalSec % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export interface UseSessionTimerOptions {
  initialDuration: number;
  isPaused?: boolean;
  isBlocked?: boolean;
}

export function useSessionTimer({
  initialDuration,
  isPaused = false,
  isBlocked = false,
}: UseSessionTimerOptions) {
  const [prevDuration, setPrevDuration] = useState(initialDuration);
  const [remainingSeconds, setRemainingSeconds] =
    useState<number>(initialDuration);

  if (prevDuration !== initialDuration) {
    setPrevDuration(initialDuration);
    setRemainingSeconds(initialDuration);
  }

  useEffect(() => {
    if (isPaused || isBlocked) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaused, isBlocked]);

  const resetTimer = useCallback(
    (newDuration?: number) => {
      setRemainingSeconds(
        typeof newDuration === "number" ? newDuration : initialDuration,
      );
    },
    [initialDuration],
  );

  return {
    remainingSeconds,
    setRemainingSeconds,
    formattedTime: formatCountdown(remainingSeconds),
    formatCountdown,
    resetTimer,
  };
}
