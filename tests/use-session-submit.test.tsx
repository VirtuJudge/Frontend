import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSessionSubmit } from "@/hooks/session/use-session-submit";
import { apiClient } from "@/lib/api/client";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

describe("useSessionSubmit - Issue #71", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("aborts and reports error before creating upload intent when recording recovery fails", async () => {
    const createUploadIntentSpy = vi.spyOn(apiClient, "createUploadIntent");

    // Mock fetch failure when fetching videoUrl blob
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network fetch failed for blob")),
    );

    const recordedChunksRef = { current: [] };

    const { result } = renderHook(() =>
      useSessionSubmit({
        projectId: "proj-123",
        videoUrl: "blob:http://localhost:3000/mock-video-url",
        recordedChunksRef,
      }),
    );

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(createUploadIntentSpy).not.toHaveBeenCalled();
    expect(result.current.submitError).toContain("Failed to recover presentation recording");
  });
});
