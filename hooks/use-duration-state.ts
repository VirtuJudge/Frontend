"use client";

import { useState } from "react";

export function useDurationState(
  initialMinutes: number,
  initialSeconds: number,
) {
  const [minutes, setMinutes] = useState(initialMinutes);
  const [seconds, setSeconds] = useState(initialSeconds);

  return {
    minutes,
    seconds,
    setMinutes,
    setSeconds,
  };
}
