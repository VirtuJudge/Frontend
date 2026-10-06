import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSessionSubmit } from "@/hooks/session/use-session-submit";
import { apiClient } from "@/lib/api/client";
import * as uploadLib from "@/lib/upload";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

describe("useSessionSubmit - Issue #72", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("aborts immediately when checksum calculation fails without requesting upload intent", async () => {
    const createUploadIntentSpy = vi.spyOn(apiClient, "createUploadIntent");

    vi.spyOn(uploadLib, "computeFileChecksum").mockRejectedValue(
      new Error("Worker out of memory"),
    );

    const chunk = new Blob(["video data"], { type: "video/webm" });
    const recordedChunksRef = { current: [chunk] };

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
    expect(result.current.submitError).toContain("Failed to calculate video checksum");
    expect(result.current.submitError).toContain("Upload aborted");
  });
});
