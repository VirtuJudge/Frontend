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

  it("handles late rejection after unmount without error updates", async () => {
    let rejectGetUserMedia!: (err: Error) => void;
    const pendingPromise = new Promise<MediaStream>((_, reject) => {
      rejectGetUserMedia = reject;
    });

    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn().mockReturnValue(pendingPromise),
      },
    });
    vi.stubGlobal("MediaRecorder", vi.fn());

    const { result, unmount } = renderHook(() => useMediaStream());

    const requestPromise = result.current.requestMediaStream();
    unmount();

    rejectGetUserMedia(new Error("Permission denied"));
    const res = await requestPromise;

    expect(res).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("stops tracks from superseded overlapping requests", async () => {
    let resolveFirst!: (stream: MediaStream) => void;
    let resolveSecond!: (stream: MediaStream) => void;

    const firstPromise = new Promise<MediaStream>((resolve) => {
      resolveFirst = resolve;
    });
    const secondPromise = new Promise<MediaStream>((resolve) => {
      resolveSecond = resolve;
    });

    const stopTrack1 = vi.fn();
    const mockTrack1 = { stop: stopTrack1 } as unknown as MediaStreamTrack;
    const mockStream1 = { getTracks: () => [mockTrack1] } as unknown as MediaStream;

    const stopTrack2 = vi.fn();
    const mockTrack2 = { stop: stopTrack2 } as unknown as MediaStreamTrack;
    const mockStream2 = { getTracks: () => [mockTrack2] } as unknown as MediaStream;

    const getUserMediaSpy = vi.fn()
      .mockReturnValueOnce(firstPromise)
      .mockReturnValueOnce(secondPromise);

    vi.stubGlobal("navigator", {
      mediaDevices: { getUserMedia: getUserMediaSpy },
    });
    vi.stubGlobal("MediaRecorder", vi.fn());

    const { result } = renderHook(() => useMediaStream());

    const req1 = result.current.requestMediaStream();
    const req2 = result.current.requestMediaStream();

    // Second completes first
    resolveSecond(mockStream2);
    const stream2 = await req2;
    expect(stream2).toBe(mockStream2);
    expect(stopTrack2).not.toHaveBeenCalled();

    // First completes late (superseded)
    resolveFirst(mockStream1);
    const stream1 = await req1;
    expect(stream1).toBeNull();
    expect(stopTrack1).toHaveBeenCalled();
  });
});
