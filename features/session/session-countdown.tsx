import React from "react";

export interface SessionCountdownProps {
  countdown: number | null;
}

export function SessionCountdown({ countdown }: SessionCountdownProps) {
  if (countdown === null || countdown <= 0) return null;

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center z-50 pointer-events-none"
      aria-live="assertive"
      aria-label={`Recording starts in ${countdown}`}
    >
      <div className="flex flex-col items-center justify-center">
        <div className="w-36 h-36 sm:w-44 sm:h-44 bg-fg/10 backdrop-blur-md rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(6,249,228,0.4)] transition-all transform scale-100">
          <span className="text-8xl sm:text-9xl font-bold text-primary">
            {countdown}
          </span>
        </div>
      </div>
    </div>
  );
}
