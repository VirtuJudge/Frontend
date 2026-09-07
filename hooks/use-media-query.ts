"use client";

import { useSyncExternalStore } from "react";

export function useMediaQuery(query: string, defaultValue = false): boolean {
  const subscribe = (onStoreChange: () => void) => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return () => {};
    }

    const mediaQueryList = window.matchMedia(query);
    const listener = () => onStoreChange();

    mediaQueryList.addEventListener("change", listener);

    return () => {
      mediaQueryList.removeEventListener("change", listener);
    };
  };

  const getSnapshot = () => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return defaultValue;
    }
    return window.matchMedia(query).matches;
  };

  const getServerSnapshot = () => defaultValue;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
