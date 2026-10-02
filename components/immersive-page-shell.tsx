import React from "react";
import { cn } from "@/lib/utils";

export interface ImmersivePageShellProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  contentClassName?: string;
}

/** Shared full-screen frame for focused workflow states. */
export function ImmersivePageShell({
  children,
  header,
  contentClassName,
}: ImmersivePageShellProps) {
  return (
    <div className="fixed inset-0 flex h-full w-full items-center justify-center bg-bg p-4 text-white">
      <div className="pointer-events-none fixed left-1/2 top-0 h-55 w-150 -translate-x-1/2 rounded-full bg-accent/12 blur-[110px]" />
      {header}
      <div className={cn("relative z-10", contentClassName)}>{children}</div>
    </div>
  );
}
