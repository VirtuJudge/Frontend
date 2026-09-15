import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAudioRecorder } from "@/features/qa/hooks/use-audio-recorder";

class MockMediaStream {
  tracks: Array<{ stop: () => void; readyState: string; enabled: boolean }>;
  constructor() {
    this.tracks = [{ stop: vi.fn(), readyState: "live", enabled: true }];
  }
  getTracks() {
    return this.tracks;
  }
}

class MockMediaRecorder {
  state: "inactive" | "recording" | "paused" = "inactive";
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  static isTypeSupported = vi.fn().mockReturnValue(true);

  constructor(public stream: unknown, public options?: unknown) {}

  start() {
    this.state = "recording";
  }

  pause() {
    this.state = "paused";
  }

  resume() {
    this.state = "recording";
  }

  stop() {
    this.state = "inactive";
    if (this.ondataavailable) {
      this.ondataavailable({
        data: new Blob(["dummy-audio-content"], { type: "audio/webm" }),
      });
    }
    if (this.onstop) {
      this.onstop();
    }
  }
}

describe("useAudioRecorder hook", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    // Mock URL.createObjectURL and revokeObjectURL
    global.URL.createObjectURL = vi.fn().mockReturnValue("blob:http://localhost/test-audio");
    global.URL.revokeObjectURL = vi.fn();

    // Default navigator.mediaDevices mock
    Object.defineProperty(global.navigator, "mediaDevices", {
      value: {
        getUserMedia: vi.fn().mockResolvedValue(new MockMediaStream()),
      },
      writable: true,
      configurable: true,
    });

    // Default MediaRecorder mock
    global.MediaRecorder = MockMediaRecorder as unknown as typeof MediaRecorder;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("initializes with idle state, no draft, and zero duration", () => {
    const { result } = renderHook(() => useAudioRecorder());

    expect(result.current.state).toBe("idle");
    expect(result.current.isRecording).toBe(false);
    expect(result.current.hasDraft).toBe(false);
    expect(result.current.draft).toBeNull();
    expect(result.current.durationMs).toBe(0);
    expect(result.current.remainingMs).toBe(120_000);
    expect(result.current.error).toBeNull();
  });

  it("handles unsupported browser when MediaRecorder is missing", async () => {
    // Remove MediaRecorder
    // @ts-expect-error test unsupported
    delete global.MediaRecorder;

    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.state).toBe("error");
    expect(result.current.error?.code).toBe("unsupported_browser");
  });

  it("handles microphone permission denial", async () => {
    const denialError = new Error("Permission denied");
    denialError.name = "NotAllowedError";

    Object.defineProperty(global.navigator, "mediaDevices", {
      value: {
        getUserMedia: vi.fn().mockRejectedValue(denialError),
      },
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.state).toBe("error");
    expect(result.current.error?.code).toBe("permission_denied");
    expect(result.current.error?.message).toContain("Microphone access was denied");
  });

  it("starts recording and tracks duration", async () => {
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.state).toBe("recording");
    expect(result.current.isRecording).toBe(true);

    // Advance 500ms
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.durationMs).toBeGreaterThanOrEqual(400);
  });

  it("pauses and resumes recording correctly", async () => {
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    act(() => {
      result.current.pauseRecording();
    });

    expect(result.current.state).toBe("paused");
    expect(result.current.isPaused).toBe(true);

    const pausedDuration = result.current.durationMs;

    // Time passes while paused
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Duration should not have changed while paused
    expect(result.current.durationMs).toBe(pausedDuration);

    // Resume recording
    act(() => {
      result.current.resumeRecording();
    });

    expect(result.current.state).toBe("recording");

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.durationMs).toBeGreaterThan(pausedDuration);
  });

  it("stops recording and creates draft with audio blob", async () => {
    const onCompleteMock = vi.fn();
    const { result } = renderHook(() =>
      useAudioRecorder({ onRecordingComplete: onCompleteMock })
    );

    await act(async () => {
      await result.current.startRecording();
    });

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    await act(async () => {
      await result.current.stopRecording();
    });

    expect(result.current.state).toBe("stopped");
    expect(result.current.hasDraft).toBe(true);
    expect(result.current.draft).not.toBeNull();
    expect(result.current.draft?.url).toBe("blob:http://localhost/test-audio");
    expect(result.current.draft?.mimeType).toBe("audio/webm");
    expect(onCompleteMock).toHaveBeenCalled();
  });

  it("allows discarding draft and replacing it", async () => {
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    await act(async () => {
      await result.current.stopRecording();
    });

    expect(result.current.hasDraft).toBe(true);

    // Discard draft
    act(() => {
      result.current.discardDraft();
    });

    expect(result.current.hasDraft).toBe(false);
    expect(result.current.draft).toBeNull();
    expect(result.current.durationMs).toBe(0);
    expect(result.current.state).toBe("idle");
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("blob:http://localhost/test-audio");
  });

  it("automatically stops when maxDurationMs is reached", async () => {
    const maxReachedMock = vi.fn();
    const { result } = renderHook(() =>
      useAudioRecorder({
        maxDurationMs: 5000,
        warningThresholdMs: 4000,
        onMaxDurationReached: maxReachedMock,
      })
    );

    await act(async () => {
      await result.current.startRecording();
    });

    act(() => {
      vi.advanceTimersByTime(4200);
    });

    expect(result.current.isNearingLimit).toBe(true);
    expect(result.current.isAtLimit).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(maxReachedMock).toHaveBeenCalled();
  });
});
