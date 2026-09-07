"use client";

import { useCallback, useSyncExternalStore } from "react";

const storageCache = new Map<string, { raw: string | null; parsed: unknown }>();

function dispatchStorageEvent(key: string, newValue: string | null) {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new StorageEvent("storage", {
        key,
        newValue,
      }),
    );
  } catch {
    const event = new Event("storage");
    Object.assign(event, { key, newValue });
    window.dispatchEvent(event);
  }
}

function getStorageSnapshot<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    const cached = storageCache.get(key);

    if (cached && cached.raw === raw) {
      return cached.parsed as T;
    }

    if (raw === null) {
      storageCache.set(key, { raw: null, parsed: fallback });
      return fallback;
    }

    const parsed = JSON.parse(raw) as T;
    storageCache.set(key, { raw, parsed });
    return parsed;
  } catch {
    return fallback;
  }
}

function subscribeToStorage(key: string, callback: () => void) {
  if (typeof window === "undefined") return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key === key || event.key === null) {
      callback();
    }
  };

  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener("storage", handleStorage);
  };
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((val: T) => T)) => void] {
  const getSnapshot = useCallback(
    () => getStorageSnapshot<T>(key, initialValue),
    [key, initialValue],
  );

  const getServerSnapshot = useCallback(() => initialValue, [initialValue]);

  const subscribe = useCallback(
    (callback: () => void) => subscribeToStorage(key, callback),
    [key],
  );

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setValue = useCallback(
    (next: T | ((val: T) => T)) => {
      if (typeof window === "undefined") return;
      try {
        const current = getStorageSnapshot<T>(key, initialValue);
        const resolvedValue = next instanceof Function ? next(current) : next;
        const serialized = JSON.stringify(resolvedValue);

        window.localStorage.setItem(key, serialized);
        storageCache.set(key, { raw: serialized, parsed: resolvedValue });
        dispatchStorageEvent(key, serialized);
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, initialValue],
  );

  return [value, setValue];
}
