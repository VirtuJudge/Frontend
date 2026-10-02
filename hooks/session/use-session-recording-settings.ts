"use client";

import { useMemo } from "react";
import { getSessionConfig } from "@/lib/storage";

export function useSessionRecordingSettings(
  projectId: string,
  searchParams: { get: (name: string) => string | null },
) {
  const storedConfig = useMemo(() => getSessionConfig(projectId), [projectId]);
  const timerParam = searchParams.get("timer");
  const pauseParam = searchParams.get("pause");
  const durationParam = searchParams.get("duration");

  return {
    showTimer: timerParam !== null ? timerParam === "true" : (storedConfig?.showTimer ?? true),
    allowPauses: pauseParam !== null ? pauseParam === "true" : (storedConfig?.allowPauses ?? true),
    initialDuration: durationParam && Number.parseInt(durationParam, 10) > 0
      ? Number.parseInt(durationParam, 10)
      : (storedConfig?.presentationDuration ?? 595),
  };
}
