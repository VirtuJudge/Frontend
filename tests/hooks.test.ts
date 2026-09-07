import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMediaQuery, useIsMobile, useLocalStorage } from "@/hooks";

describe("useMediaQuery & useIsMobile", () => {
  let listeners: Record<string, ((event: MediaQueryListEvent) => void)[]> = {};
  let currentMatches: Record<string, boolean> = {};

  beforeEach(() => {
    listeners = {};
    currentMatches = {};

    window.matchMedia = vi.fn().mockImplementation((query: string) => {
      if (!listeners[query]) {
        listeners[query] = [];
      }
      if (currentMatches[query] === undefined) {
        currentMatches[query] = false;
      }

      return {
        media: query,
        get matches() {
          return currentMatches[query];
        },
        addEventListener: vi.fn((event: string, handler: (e: MediaQueryListEvent) => void) => {
          if (event === "change") {
            listeners[query].push(handler);
          }
        }),
        removeEventListener: vi.fn((event: string, handler: (e: MediaQueryListEvent) => void) => {
          if (event === "change") {
            listeners[query] = listeners[query].filter((h) => h !== handler);
          }
        }),
        dispatchEvent: vi.fn(),
      };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns default value when matchMedia is not matched", () => {
    currentMatches["(max-width: 1079.98px)"] = false;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("returns match state for direct useMediaQuery call", () => {
    currentMatches["(min-width: 1200px)"] = true;
    const { result } = renderHook(() => useMediaQuery("(min-width: 1200px)"));
    expect(result.current).toBe(true);
  });

  it("returns true when viewport matches less than 1080px", () => {
    currentMatches["(max-width: 1079.98px)"] = true;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("updates value reactively when media query change event fires", () => {
    const query = "(max-width: 1079.98px)";
    currentMatches[query] = false;

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    // Simulate window resizing below 1080px
    act(() => {
      currentMatches[query] = true;
      listeners[query]?.forEach((handler) =>
        handler({ matches: true, media: query } as MediaQueryListEvent)
      );
    });

    expect(result.current).toBe(true);

    // Simulate window resizing back above 1080px
    act(() => {
      currentMatches[query] = false;
      listeners[query]?.forEach((handler) =>
        handler({ matches: false, media: query } as MediaQueryListEvent)
      );
    });

    expect(result.current).toBe(false);
  });

  it("supports custom breakpoints in useIsMobile", () => {
    currentMatches["(max-width: 767.98px)"] = true;
    const { result } = renderHook(() => useIsMobile(768));
    expect(result.current).toBe(true);
  });

  it("cleans up event listener on unmount", () => {
    const query = "(max-width: 1079.98px)";
    const { unmount } = renderHook(() => useIsMobile());
    expect(listeners[query]?.length).toBe(1);

    unmount();
    expect(listeners[query]?.length).toBe(0);
  });
});

describe("useLocalStorage", () => {
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    const mockStorage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = String(value);
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    };
    Object.defineProperty(window, "localStorage", {
      value: mockStorage,
      writable: true,
      configurable: true,
    });
  });

  it("returns initial value when key is not in localStorage", () => {
    const { result } = renderHook(() =>
      useLocalStorage("test_key", false)
    );
    expect(result.current[0]).toBe(false);
  });

  it("loads existing value from localStorage", () => {
    window.localStorage.setItem("test_key", JSON.stringify(true));
    const { result } = renderHook(() =>
      useLocalStorage("test_key", false)
    );
    expect(result.current[0]).toBe(true);
  });

  it("updates state and writes to localStorage", () => {
    const { result } = renderHook(() =>
      useLocalStorage("test_key", false)
    );

    act(() => {
      result.current[1](true);
    });

    expect(result.current[0]).toBe(true);
    expect(window.localStorage.getItem("test_key")).toBe("true");
  });
});
