"use client";

import { Text, If, Wrapper } from "@/components";
import { cn } from "@/lib/utils";

export interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  className?: string;
}

export function ToggleSwitch({
  checked,
  onChange,
  label,
  className,
}: ToggleSwitchProps) {
  return (
    <div
      role="switch"
      tabIndex={0}
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onChange(!checked);
        }
      }}
      className={cn(
        "flex flex-wrap items-center gap-3.5 cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg rounded-lg",
        className,
      )}
    >
      <Wrapper className="w-16 h-7 rounded-full transition-all relative flex items-center px-1.25 bg-primary/10 translate-x-0">
        <div
          className={cn(
            "w-5.5 h-5.5 rounded-full transition-transform",
            checked ? "bg-primary translate-x-8" : "bg-bg-light border border-primary",
          )}
        />
      </Wrapper>
      <If condition={label}>
        <Text
          as="span"
          size="sm"
          className="font-medium text-foreground/85 group-hover:text-foreground transition-colors"
        >
          {label}
        </Text>
      </If>
    </div>
  );
}
