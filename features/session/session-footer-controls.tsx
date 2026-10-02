import React from "react";
import { Icon } from "@iconify/react";
import { Wrapper } from "@/components";
import { SessionControlPill } from "./session-control-pill";
import { SessionTimerBadge } from "./session-timer-badge";

export interface SessionFooterControlsProps {
  allowPauses: boolean;
  isPaused: boolean;
  showTimer: boolean;
  formattedTime: string;
  onTogglePause: () => void;
  onStopRecording: () => void;
  onRestartModalOpen: () => void;
}

export function SessionFooterControls({
  allowPauses,
  isPaused,
  showTimer,
  formattedTime,
  onTogglePause,
  onStopRecording,
  onRestartModalOpen,
}: SessionFooterControlsProps) {
  return (
    <div className="fixed bottom-8 inset-x-0 px-6 sm:px-12 flex items-center z-40 flex-wrap gap-3">
      <div className="flex-1 flex items-center justify-start">
        <div className="flex items-center gap-3 pointer-events-auto">
          <Wrapper
            as="button"
            variant="glass-dark"
            borderGradient="default"
            onClick={onRestartModalOpen}
            className="w-12 h-12 p-0 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-xl cursor-pointer hover:brightness-125"
            aria-label="Restart session"
          >
            <Icon icon="tabler:rotate" className="text-xl" />
          </Wrapper>

          <Wrapper
            variant="glass-dark"
            className="h-12 px-5 py-0 rounded-full flex items-center gap-2 font-medium"
            aria-label="Presentation"
          >
            <Icon icon="tabler:presentation" className="text-xl" />
            <span>Presentation</span>
          </Wrapper>
        </div>
      </div>

      <div className="flex items-center justify-center pointer-events-auto shrink-0">
        <SessionControlPill
          allowPauses={allowPauses}
          isPaused={isPaused}
          onTogglePause={onTogglePause}
          onEnd={onStopRecording}
        />
      </div>

      <div className="flex-1 flex items-center justify-end">
        <SessionTimerBadge
          showTimer={showTimer}
          formattedTime={formattedTime}
        />
      </div>
    </div>
  );
}
