"use client";

import { Icon } from "@iconify/react";
import { Wrapper } from "@/components";

export interface SessionTimerBadgeProps {
  showTimer?: boolean;
  formattedTime?: string;
}

export function SessionTimerBadge({
  showTimer = true,
  formattedTime,
}: SessionTimerBadgeProps) {
  return (
    <div className="pointer-events-auto">
      {showTimer ? (
        <Wrapper
          variant="glass-dark"
          borderGradient="default"
          className="h-12 px-4 py-0 rounded-full flex items-center gap-2 text-white shadow-xl"
        >
          <Icon icon="tabler:stopwatch" className="text-xl text-white/90" />
          <span className=" text-sm tracking-wider font-semibold">
            {formattedTime}
          </span>
        </Wrapper>
      ) : (
        <Wrapper
          variant="glass-dark"
          borderGradient="default"
          className="w-12 h-12 p-0 rounded-full flex items-center justify-center text-white shadow-xl"
        >
          <Icon icon="tabler:stopwatch" className="text-xl text-white/90" />
        </Wrapper>
      )}
    </div>
  );
}
