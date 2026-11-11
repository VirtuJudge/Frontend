import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useMediaStream } from "@/hooks/qa/use-media-stream";

describe("useMediaStream - Lifecycle and Leak Prevention", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("reproduces leak: stops tracks when getUserMedia resolves after hook unmount", async () => {
    let resolveGetUserMedia!: (stream: MediaStream) => void;
    const pendingPromise = new Promise<MediaStream>((resolve) => {
      resolveGetUserMedia = resolve;
    });

    const stopTrackSpy = vi.fn();
    const mockTrack = { stop: stopTrackSpy } as unknown as MediaStreamTrack;
    const mockStream = {
      getTracks: () => [mockTrack],
    } as unknown as MediaStream;

    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn().mockReturnValue(pendingPromise),
      },
    });
    vi.stubGlobal("MediaRecorder", vi.fn());

    const { result, unmount } = renderHook(() => useMediaStream());

    // Trigger permission request
    const requestPromise = result.current.requestMediaStream();

    // Unmount before user grants permission
    unmount();

    // User grants permission after unmount
    resolveGetUserMedia(mockStream);
    const returnedStream = await requestPromise;

    // Track MUST be stopped immediately and returnedStream should be null
    expect(stopTrackSpy).toHaveBeenCalled();
    expect(returnedStream).toBeNull();
  });
});
