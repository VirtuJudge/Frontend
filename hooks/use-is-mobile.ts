"use client";

import { useMediaQuery } from "./use-media-query";

export function useIsMobile(breakpoint = 1080, defaultValue = false): boolean {
  // Using max-width with subpixel offset (0.02px) to match standard CSS '< breakpoint' behavior
  return useMediaQuery(`(max-width: ${breakpoint - 0.02}px)`, defaultValue);
}
