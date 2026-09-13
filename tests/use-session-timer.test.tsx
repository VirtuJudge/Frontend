import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSessionTimer, formatCountdown } from "@/hooks/use-session-timer";

describe("useSessionTimer Hook", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats countdown correctly", () => {
    expect(formatCountdown(0)).toBe("00:00");
    expect(formatCountdown(59)).toBe("00:59");
    expect(formatCountdown(60)).toBe("01:00");
    expect(formatCountdown(595)).toBe("09:55");
    expect(formatCountdown(3600)).toBe("60:00");
  });

  it("counts down seconds when active", () => {
    const { result } = renderHook(() =>
      useSessionTimer({ initialDuration: 10 }),
    );

    expect(result.current.remainingSeconds).toBe(10);
    expect(result.current.formattedTime).toBe("00:10");

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.remainingSeconds).toBe(7);
    expect(result.current.formattedTime).toBe("00:07");
  });

  it("stops counting when reaching 0", () => {
    const { result } = renderHook(() =>
      useSessionTimer({ initialDuration: 2 }),
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.remainingSeconds).toBe(0);
    expect(result.current.formattedTime).toBe("00:00");
  });

  it("does not count down when paused or blocked", () => {
    const { result, rerender } = renderHook(
      ({ isPaused, isBlocked }) =>
        useSessionTimer({
          initialDuration: 10,
          isPaused,
          isBlocked,
        }),
      {
        initialProps: { isPaused: true, isBlocked: false },
      },
    );

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.remainingSeconds).toBe(10);

    rerender({ isPaused: false, isBlocked: true });

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.remainingSeconds).toBe(10);
  });

  it("resets timer with resetTimer", () => {
    const { result } = renderHook(() =>
      useSessionTimer({ initialDuration: 20 }),
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.remainingSeconds).toBe(15);

    act(() => {
      result.current.resetTimer();
    });

    expect(result.current.remainingSeconds).toBe(20);

    act(() => {
      result.current.resetTimer(45);
    });

    expect(result.current.remainingSeconds).toBe(45);
  });
});
