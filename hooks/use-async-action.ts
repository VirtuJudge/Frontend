"use client";

import { useCallback, useState } from "react";

export interface AsyncActionState<Result> {
  error: string | null;
  isPending: boolean;
  run: () => Promise<Result | undefined>;
  setError: (error: string | null) => void;
}

/**
 * Owns the common lifecycle of a user-initiated async action. Callers keep
 * their domain validation and success behavior while loading and error state
 * are represented consistently.
 */
export function useAsyncAction<Result>(
  action: () => Promise<Result>,
  fallbackError: string,
): AsyncActionState<Result> {
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const run = useCallback(async () => {
    setIsPending(true);
    setError(null);

    try {
      return await action();
    } catch (cause) {
      setError(
        cause instanceof Error && cause.message ? cause.message : fallbackError,
      );
      return undefined;
    } finally {
      setIsPending(false);
    }
  }, [action, fallbackError]);

  return { error, isPending, run, setError };
}
