"use client";

import { Text } from "@/components/text";

export interface DurationPickerProps {
  label: string;
  minutes: number;
  seconds: number;
  onMinutesChange: (newMin: number) => void;
  onSecondsChange: (newSec: number) => void;
}

export function DurationPicker({
  label,
  minutes,
  seconds,
  onMinutesChange,
  onSecondsChange,
}: DurationPickerProps) {
  const handleIncrementSeconds = () => {
    if (seconds + 5 >= 60) {
      onMinutesChange(minutes + 1);
      onSecondsChange((seconds + 5) % 60);
    } else {
      onSecondsChange(seconds + 5);
    }
  };

  const handleDecrementSeconds = () => {
    if (seconds - 5 < 0) {
      if (minutes > 0) {
        onMinutesChange(minutes - 1);
        onSecondsChange(seconds - 5 + 60);
      } else {
        onSecondsChange(0);
      }
    } else {
      onSecondsChange(seconds - 5);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <Text
        as="span"
        size="sm"
        className="font-medium text-foreground/85 mb-3 tracking-wide"
      >
        {label}
      </Text>
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="flex flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={() => onMinutesChange(minutes + 1)}
            aria-label={`Increment ${label} minutes`}
            className="w-6 h-6 rounded-full border border-foreground/40 flex items-center justify-center text-sm font-bold text-foreground/70 hover:border-primary hover:text-primary transition-colors cursor-pointer select-none"
          >
            +
          </button>
          <Text as="span" size="xs" className="text-foreground/60 select-none">
            min
          </Text>
          <button
            type="button"
            onClick={() => onMinutesChange(Math.max(0, minutes - 1))}
            aria-label={`Decrement ${label} minutes`}
            className="w-6 h-6 rounded-full border border-foreground/40 flex items-center justify-center text-sm font-bold text-foreground/70 hover:border-primary hover:text-primary transition-colors cursor-pointer select-none"
          >
            -
          </button>
        </div>

        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#021f1c]/80 border border-[#06F9E4]/40 flex items-center justify-center font-bold text-xl sm:text-2xl text-fg shadow-md shadow-primary/20 select-none">
          {String(minutes).padStart(2, "0")}
        </div>

        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#021f1c]/80 border border-[#06F9E4]/40 flex items-center justify-center font-bold text-xl sm:text-2xl text-fg shadow-md shadow-primary/20 select-none">
          {String(seconds).padStart(2, "0")}
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={handleIncrementSeconds}
            aria-label={`Increment ${label} seconds`}
            className="w-6 h-6 rounded-full border border-foreground/40 flex items-center justify-center text-sm font-bold text-foreground/70 hover:border-primary hover:text-primary transition-colors cursor-pointer select-none"
          >
            +
          </button>
          <Text as="span" size="xs" className="text-foreground/60 select-none">
            sec
          </Text>
          <button
            type="button"
            onClick={handleDecrementSeconds}
            aria-label={`Decrement ${label} seconds`}
            className="w-6 h-6 rounded-full border border-foreground/40 flex items-center justify-center text-sm font-bold text-foreground/70 hover:border-primary hover:text-primary transition-colors cursor-pointer select-none"
          >
            -
          </button>
        </div>
      </div>
    </div>
  );
}
