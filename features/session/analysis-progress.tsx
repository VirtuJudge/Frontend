"use client";

import { Text } from "@/components";
import type { AnalysisProgressedEvent } from "@/lib/api/types";

export interface AnalysisProgressProps {
  progress: AnalysisProgressedEvent | null;
}

function formatStage(stage: string): string {
  return stage.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function AnalysisProgress({ progress }: AnalysisProgressProps) {
  if (!progress) return null;

  const percent = Math.round(progress.progress * 100);
  return (
    <div className="w-full space-y-2 text-left" role="status" aria-live="polite">
      <div className="flex items-center justify-between gap-4 text-xs font-mono text-primary">
        <Text size="xs">{formatStage(progress.stage)}</Text>
        <span>{percent}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10" aria-label={`${formatStage(progress.stage)} ${percent}%`}>
        <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
