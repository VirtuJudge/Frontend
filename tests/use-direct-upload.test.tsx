import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDirectUpload } from "@/hooks/use-direct-upload";
import { apiClient } from "@/lib/api/client";
import * as uploadLib from "@/lib/upload";
import { Asset } from "@/lib/api/types";

describe("useDirectUpload Hook (Phase 3)", () => {
  const mockProjectId = "01J6GZ3C000000000000000003";

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fails immediately on invalid file type", async () => {
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useDirectUpload({
        projectId: mockProjectId,
        onUploadError: onError,
      }),
    );

    const badFile = new File(["test data"], "invalid.exe", {
      type: "application/x-msdownload",
    });

    let uploaded: Asset | null = null;
    await act(async () => {
      uploaded = await result.current.uploadFile(badFile, "supporting_document");
    });

    expect(uploaded).toBeNull();
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].stage).toBe("error");
    expect(result.current.items[0].error).toContain("unsupported format");
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("fails immediately on oversized file", async () => {
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useDirectUpload({
        projectId: mockProjectId,
        onUploadError: onError,
      }),
    );

    const hugeDoc = new File(["pdf"], "huge.pdf", {
      type: "application/pdf",
    });
    Object.defineProperty(hugeDoc, "size", {
      value: 30 * 1024 * 1024,
    });

    await act(async () => {
      await result.current.uploadFile(hugeDoc, "supporting_document");
    });

    expect(result.current.items[0].stage).toBe("error");
    expect(result.current.items[0].error).toContain("exceeds the maximum allowed size of 25 MB");
    expect(onError).toHaveBeenCalled();
  });

  it("completes full multi-stage upload flow successfully", async () => {
    const onSuccess = vi.fn();

    vi.spyOn(uploadLib, "computeFileChecksum").mockResolvedValue(
      "sha256:0000111122223333444455556666777788889999aaaabbbbccccddddeeeeffff",
    );

    vi.spyOn(apiClient, "createUploadIntent").mockResolvedValue({
      asset_id: "01J6GZASSET00000000000001",
      version_id: "01J6GZVER0000000000000001",
      upload_url: "https://storage.virtujudge.local/mock-bucket/video.mp4?sig=abc",
      expires_at: new Date().toISOString(),
    });

    vi.spyOn(uploadLib, "uploadFileDirectly").mockImplementation(
      async ({ onProgress }) => {
        onProgress?.({ bytesUploaded: 500, totalBytes: 1000, percentage: 50 });
        onProgress?.({ bytesUploaded: 1000, totalBytes: 1000, percentage: 100 });
      },
    );

    const verifiedAsset: Asset = {
      id: "01J6GZASSET00000000000001",
      project_id: mockProjectId,
      kind: "presentation_video",
      file_name: "pitch.mp4",
      media_type: "video/mp4",
      size_bytes: 1000,
      state: "verified",
      checksum: "sha256:0000111122223333444455556666777788889999aaaabbbbccccddddeeeeffff",
      created_at: new Date().toISOString(),
    };

    vi.spyOn(apiClient, "completeUpload").mockResolvedValue(verifiedAsset);
    vi.spyOn(apiClient, "getAsset").mockResolvedValue(verifiedAsset);

    const { result } = renderHook(() =>
      useDirectUpload({
        projectId: mockProjectId,
        onUploadSuccess: onSuccess,
        pollIntervalMs: 10,
      }),
    );

    const validVideo = new File(["video content"], "pitch.mp4", {
      type: "video/mp4",
    });

    let uploaded: Asset | null = null;
    await act(async () => {
      uploaded = await result.current.uploadFile(validVideo, "presentation_video");
    });

    expect(uploaded).toEqual(verifiedAsset);
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].stage).toBe("verified");
    expect(result.current.items[0].progress).toBe(100);
    expect(onSuccess).toHaveBeenCalledWith(verifiedAsset);
  });

  it("handles backend verification rejection with reason", async () => {
    vi.spyOn(uploadLib, "computeFileChecksum").mockResolvedValue("sha256:badhash");
    vi.spyOn(apiClient, "createUploadIntent").mockResolvedValue({
      asset_id: "01J6GZREJECT000000000001",
      version_id: "01J6GZVER0000000000000002",
      upload_url: "https://storage.virtujudge.local/mock-bucket/rejected.mp4",
      expires_at: new Date().toISOString(),
    });
    vi.spyOn(uploadLib, "uploadFileDirectly").mockResolvedValue();

    const rejectedAsset: Asset = {
      id: "01J6GZREJECT000000000001",
      project_id: mockProjectId,
      kind: "presentation_video",
      file_name: "corrupted.mp4",
      media_type: "video/mp4",
      size_bytes: 500,
      state: "rejected",
      rejection_reason: "Checksum mismatch detected during deep verification",
      rejection_code: "CHECKSUM_MISMATCH",
      created_at: new Date().toISOString(),
    };

    vi.spyOn(apiClient, "completeUpload").mockResolvedValue(rejectedAsset);
    vi.spyOn(apiClient, "getAsset").mockResolvedValue(rejectedAsset);

    const { result } = renderHook(() =>
      useDirectUpload({
        projectId: mockProjectId,
        pollIntervalMs: 10,
      }),
    );

    const corruptedFile = new File(["bad data"], "corrupted.mp4", {
      type: "video/mp4",
    });

    await act(async () => {
      await result.current.uploadFile(corruptedFile, "presentation_video");
    });

    expect(result.current.items[0].stage).toBe("rejected");
    expect(result.current.items[0].rejectionReason).toBe(
      "Checksum mismatch detected during deep verification",
    );
  });

  it("allows cancelling an upload and retrying with retryUpload", async () => {
    vi.spyOn(uploadLib, "computeFileChecksum").mockResolvedValue("sha256:retryhash");

    let shouldFail = true;
    vi.spyOn(uploadLib, "uploadFileDirectly").mockImplementation(async () => {
      if (shouldFail) {
        throw new Error("Simulated network disconnection");
      }
    });

    vi.spyOn(apiClient, "createUploadIntent").mockResolvedValue({
      asset_id: "01J6GZRETRY000000000001",
      version_id: "01J6GZVER0000000000000003",
      upload_url: "https://storage.virtujudge.local/mock-bucket/retry.pdf",
      expires_at: new Date().toISOString(),
    });

    const verifiedDoc: Asset = {
      id: "01J6GZRETRY000000000001",
      project_id: mockProjectId,
      kind: "supporting_document",
      file_name: "retry.pdf",
      media_type: "application/pdf",
      size_bytes: 300,
      state: "verified",
      created_at: new Date().toISOString(),
    };

    vi.spyOn(apiClient, "completeUpload").mockResolvedValue(verifiedDoc);
    vi.spyOn(apiClient, "getAsset").mockResolvedValue(verifiedDoc);

    const { result } = renderHook(() =>
      useDirectUpload({
        projectId: mockProjectId,
        pollIntervalMs: 10,
      }),
    );

    const testDoc = new File(["doc content"], "retry.pdf", {
      type: "application/pdf",
    });

    await act(async () => {
      await result.current.uploadFile(testDoc, "supporting_document");
    });

    expect(result.current.items[0].stage).toBe("error");
    expect(result.current.items[0].error).toContain("Simulated network disconnection");

    shouldFail = false;
    await act(async () => {
      await result.current.retryUpload(result.current.items[0].id);
    });

    expect(result.current.items[0].stage).toBe("verified");
  });

  it("removes and clears completed items", async () => {
    const { result } = renderHook(() =>
      useDirectUpload({
        projectId: mockProjectId,
      }),
    );

    const badFile = new File(["bad"], "bad.xyz", { type: "unknown" });
    await act(async () => {
      await result.current.uploadFile(badFile, "supporting_document");
    });

    expect(result.current.items).toHaveLength(1);

    act(() => {
      result.current.removeUploadItem(result.current.items[0].id);
    });

    expect(result.current.items).toHaveLength(0);
  });

  it("transitions out of verifying into error on exhausted polling and allows retryVerification", async () => {
    const onError = vi.fn();

    vi.spyOn(uploadLib, "computeFileChecksum").mockResolvedValue(
      "sha256:0000111122223333444455556666777788889999aaaabbbbccccddddeeeeffff",
    );

    vi.spyOn(apiClient, "createUploadIntent").mockResolvedValue({
      asset_id: "asset_timeout_123",
      version_id: "version_timeout_123",
      upload_url: "https://storage.virtujudge.local/mock/doc.pdf",
      expires_at: new Date().toISOString(),
    });

    vi.spyOn(uploadLib, "uploadFileDirectly").mockResolvedValue(undefined);

    const pendingAsset: Asset = {
      id: "asset_timeout_123",
      project_id: mockProjectId,
      kind: "supporting_document",
      file_name: "timeout.pdf",
      media_type: "application/pdf",
      size_bytes: 500,
      state: "uploaded",
      checksum: "sha256:0000111122223333444455556666777788889999aaaabbbbccccddddeeeeffff",
      created_at: new Date().toISOString(),
    };

    vi.spyOn(apiClient, "completeUpload").mockResolvedValue(pendingAsset);
    // Keep returning uploaded state so verification polls exhaust
    let getAssetCalls = 0;
    vi.spyOn(apiClient, "getAsset").mockImplementation(async () => {
      getAssetCalls++;
      if (getAssetCalls > 3) {
        return {
          ...pendingAsset,
          state: "verified",
        };
      }
      return pendingAsset;
    });

    const { result } = renderHook(() =>
      useDirectUpload({
        projectId: mockProjectId,
        maxPollAttempts: 2,
        pollIntervalMs: 5,
        onUploadError: onError,
      }),
    );

    const testDoc = new File(["timeout test"], "timeout.pdf", {
      type: "application/pdf",
    });

    await act(async () => {
      await result.current.uploadFile(testDoc, "supporting_document");
    });

    // Should not be stuck in verifying; should transition to error, retain assetId, and notify onError
    expect(result.current.items[0].stage).toBe("error");
    expect(result.current.items[0].assetId).toBe("asset_timeout_123");
    expect(result.current.items[0].error).toContain("Verification timed out");
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("Verification timed out") }),
      expect.objectContaining({ assetId: "asset_timeout_123", stage: "error" }),
    );

    // Now test retryVerification succeeds when backend is ready
    let retriedAsset: Asset | null = null;
    await act(async () => {
      retriedAsset = await result.current.retryVerification(result.current.items[0].id);
    });

    expect(retriedAsset).not.toBeNull();
    expect(result.current.items[0].stage).toBe("verified");
  });
});
