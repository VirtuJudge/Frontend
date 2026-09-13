"use client";

import { Icon } from "@iconify/react";
import { Wrapper } from "@/components";

export interface SessionControlPillProps {
  allowPauses?: boolean;
  isPaused: boolean;
  onTogglePause: () => void;
  onEnd: () => void;
}

export function SessionControlPill({
  allowPauses = true,
  isPaused,
  onTogglePause,
  onEnd,
}: SessionControlPillProps) {
  return (
    <Wrapper
      variant="glass-dark"
      borderGradient="default"
      className="h-12 px-0 py-0 rounded-full flex items-center shadow-xl overflow-hidden"
    >
      {allowPauses && (
        <>
          <button
            type="button"
            onClick={onTogglePause}
            className="w-12 h-12 flex items-center justify-center text-white hover:text-primary transition-colors cursor-pointer"
            aria-label={isPaused ? "Resume recording" : "Pause recording"}
          >
            {isPaused ? (
              <Icon
                icon="tabler:player-play-filled"
                className="text-lg ml-0.5"
              />
            ) : (
              <div className="flex items-center gap-1">
                <span className="w-1 h-3.5 bg-white rounded-full" />
                <span className="w-1 h-3.5 bg-white rounded-full" />
              </div>
            )}
          </button>

          <div className="w-px h-5 bg-white/20" />
        </>
      )}

      <button
        type="button"
        onClick={onEnd}
        className={`${
          allowPauses ? "w-12" : "w-14"
        } h-12 flex items-center justify-center text-white hover:text-red-400 transition-colors cursor-pointer`}
        aria-label="End session"
      >
        <div className="w-3.5 h-3.5 bg-white rounded-xs" />
      </button>
    </Wrapper>
  );
}
