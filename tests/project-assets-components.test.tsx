import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  DocumentVersionSelector,
  UploadDropzone,
  UploadProgressList,
  ProjectAssetList,
} from "@/features/upload";
import { Asset, AssetVersion } from "@/lib/api/types";
import { UploadItem } from "@/hooks/use-direct-upload";
import { apiClient } from "@/lib/api/client";

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

const initialAssets: Asset[] = [
  {
    id: "01J6GZ5E000000000000000005",
    project_id: "01J6GZ3C000000000000000003",
    kind: "presentation_video",
    file_name: "pitch_demo.mp4",
    media_type: "video/mp4",
    size_bytes: 45000000,
    state: "verified",
    checksum:
      "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    duration_ms: 360000,
    created_at: "2026-09-01T11:30:00Z",
    version_id: "01J6GZVER00000000000000001",
    versions: [
      {
        id: "01J6GZVER00000000000000001",
        asset_id: "01J6GZ5E000000000000000005",
        version_number: 1,
        checksum:
          "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        size_bytes: 45000000,
        media_type: "video/mp4",
        duration_ms: 360000,
        created_at: "2026-09-01T11:30:00Z",
      },
    ],
  },
  {
    id: "01J6GZ6F000000000000000006",
    project_id: "01J6GZ3C000000000000000003",
    kind: "supporting_document",
    file_name: "investor_deck.pdf",
    media_type: "application/pdf",
    size_bytes: 12500000,
    state: "verified",
    checksum:
      "sha256:f4c8996fb92427ae41e4649b934ca495991b7852b855e3b0c44298fc1c149afb",
    created_at: "2026-09-01T11:45:00Z",
    version_id: "01J6GZVER00000000000000002",
    versions: [
      {
        id: "01J6GZVER00000000000000002",
        asset_id: "01J6GZ6F000000000000000006",
        version_number: 1,
        checksum:
          "sha256:f4c8996fb92427ae41e4649b934ca495991b7852b855e3b0c44298fc1c149afb",
        size_bytes: 12500000,
        media_type: "application/pdf",
        created_at: "2026-09-01T11:45:00Z",
      },
    ],
  },
];

let currentAssets: Asset[] = [];

describe("Upload & Asset Management Components (FE-02)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentAssets = JSON.parse(JSON.stringify(initialAssets));
    vi.spyOn(apiClient, "getAssets").mockImplementation(
      async (projectId, filters) => {
        let filtered = currentAssets.filter(
          (a) => a.project_id === projectId,
        );
        if (filters?.kind) {
          filtered = filtered.filter((a) => a.kind === filters.kind);
        }
        return { items: filtered, has_more: false };
      },
    );
    vi.spyOn(apiClient, "getAssetVersions").mockImplementation(
      async (assetId) => {
        const a = currentAssets.find((x) => x.id === assetId);
        return { items: a?.versions || [], has_more: false };
      },
    );
  });

  describe("DocumentVersionSelector", () => {
    const mockVersions: AssetVersion[] = [
      {
        id: "ver-1",
        asset_id: "asset-1",
        version_number: 1,
        checksum: "sha256:1111111111111111111111111111111111111111111111111111111111111111",
        size_bytes: 1048576,
        media_type: "application/pdf",
        created_at: "2026-09-01T10:00:00Z",
      },
      {
        id: "ver-2",
        asset_id: "asset-1",
        version_number: 2,
        checksum: "sha256:2222222222222222222222222222222222222222222222222222222222222222",
        size_bytes: 2097152,
        media_type: "application/pdf",
        created_at: "2026-09-02T12:00:00Z",
      },
    ];

    it("renders active version and opens dropdown on click", () => {
      const onSelect = vi.fn();
      render(
        <DocumentVersionSelector
          versions={mockVersions}
          selectedVersionId="ver-1"
          onSelectVersion={onSelect}
        />,
      );

      const trigger = screen.getByRole("button", { name: /v1/i });
      expect(trigger).toBeDefined();

      fireEvent.click(trigger);

      expect(screen.getByText("Version History")).toBeDefined();
      expect(screen.getByText("v2")).toBeDefined();

      const optionV2 = screen.getByRole("option", { name: /v2/i });
      fireEvent.click(optionV2);

      expect(onSelect).toHaveBeenCalledWith("ver-2");
    });

    it("renders fallback text if no versions exist", () => {
      render(
        <DocumentVersionSelector
          versions={[]}
          onSelectVersion={vi.fn()}
        />,
      );
      expect(screen.getByText("v1 (latest)")).toBeDefined();
    });
  });

  describe("UploadDropzone", () => {
    it("renders presentation video rules", () => {
      render(
        <UploadDropzone
          kind="presentation_video"
          onFilesSelected={vi.fn()}
        />,
      );

      expect(screen.getByText("Upload pitch video")).toBeDefined();
      expect(screen.getByText(".mp4, .webm")).toBeDefined();
      expect(screen.getByText("Max 500 MB")).toBeDefined();
      expect(screen.getByText("Max 10 min")).toBeDefined();
    });

    it("renders supporting document rules and file count", () => {
      render(
        <UploadDropzone
          kind="supporting_document"
          onFilesSelected={vi.fn()}
          maxFiles={5}
          currentCount={3}
        />,
      );

      expect(screen.getByText("Upload supporting documents")).toBeDefined();
      expect(screen.getByText(".pdf, .pptx")).toBeDefined();
      expect(screen.getByText("Max 25 MB")).toBeDefined();
      expect(screen.getByText("3 / 5 files")).toBeDefined();
    });

    it("disables dropzone when max file limit is reached", () => {
      render(
        <UploadDropzone
          kind="supporting_document"
          onFilesSelected={vi.fn()}
          maxFiles={5}
          currentCount={5}
        />,
      );

      expect(screen.getByText("Limit reached (5/5)")).toBeDefined();
      const dropzone = screen.getByRole("button");
      expect(dropzone.getAttribute("aria-disabled")).toBe("true");
    });
  });

  describe("UploadProgressList", () => {
    it("renders progress and stages correctly", () => {
      const items: UploadItem[] = [
        {
          id: "item-1",
          file: new File(["data"], "pitch_deck.pdf", { type: "application/pdf" }),
          kind: "supporting_document",
          stage: "hashing",
          progress: 0,
          hashProgress: 45,
        },
        {
          id: "item-2",
          file: new File(["video"], "rehearsal.mp4", { type: "video/mp4" }),
          kind: "presentation_video",
          stage: "uploading",
          progress: 80,
          hashProgress: 100,
        },
        {
          id: "item-3",
          file: new File(["data"], "verified.pdf", { type: "application/pdf" }),
          kind: "supporting_document",
          stage: "verified",
          progress: 100,
          hashProgress: 100,
        },
      ];

      render(
        <UploadProgressList
          items={items}
          onRetry={vi.fn()}
          onCancel={vi.fn()}
          onRemove={vi.fn()}
        />,
      );

      expect(screen.getByText("Upload Activity (3)")).toBeDefined();
      expect(screen.getByText("pitch_deck.pdf")).toBeDefined();
      expect(screen.getByText("Hashing 45%")).toBeDefined();
      expect(screen.getByText("rehearsal.mp4")).toBeDefined();
      expect(screen.getByText("Uploading 80%")).toBeDefined();
      expect(screen.getByText("verified.pdf")).toBeDefined();
      expect(screen.getByText("Verified")).toBeDefined();
    });

    it("displays rejection reason and retry action for rejected upload", () => {
      const onRetry = vi.fn();
      const items: UploadItem[] = [
        {
          id: "item-fail",
          file: new File(["data"], "corrupted.mp4", { type: "video/mp4" }),
          kind: "presentation_video",
          stage: "rejected",
          progress: 100,
          hashProgress: 100,
          rejectionReason: "Deep video verification failed: unsupported codec",
        },
      ];

      render(
        <UploadProgressList
          items={items}
          onRetry={onRetry}
        />,
      );

      expect(screen.getByText("Rejected")).toBeDefined();
      expect(
        screen.getByText("Deep video verification failed: unsupported codec"),
      ).toBeDefined();

      const retryBtn = screen.getByRole("button", { name: /retry/i });
      fireEvent.click(retryBtn);

      expect(onRetry).toHaveBeenCalledWith("item-fail");
    });
  });

  describe("ProjectAssetList", () => {
    it("renders supporting documents section with actions", async () => {
      renderWithProviders(
        <ProjectAssetList projectId="01J6GZ3C000000000000000003" />,
      );

      await waitFor(() => {
        expect(screen.getAllByText("investor_deck.pdf").length).toBeGreaterThan(0);
      });

      expect(screen.getByText("Slides & Documents")).toBeDefined();
      expect(screen.getByText(/Max 5 per session/i)).toBeDefined();
      expect(screen.getAllByText("investor_deck.pdf").length).toBeGreaterThan(0);
    });

    it("triggers download intent when download button is clicked", async () => {
      const downloadSpy = vi
        .spyOn(apiClient, "createDownloadIntent")
        .mockResolvedValue({
          download_url: "https://storage.virtujudge.local/download/test.pdf",
          expires_at: new Date().toISOString(),
          media_type: "application/pdf",
          size_bytes: 1024,
          file_name: "test.pdf",
        });

      renderWithProviders(
        <ProjectAssetList projectId="01J6GZ3C000000000000000003" />,
      );

      await waitFor(() => {
        expect(screen.getAllByText("investor_deck.pdf").length).toBeGreaterThan(0);
      });

      const downloadButtons = screen.getAllByRole("button", { name: /download/i });
      expect(downloadButtons.length).toBeGreaterThan(0);

      fireEvent.click(downloadButtons[0]);

      await waitFor(() => {
        expect(downloadSpy).toHaveBeenCalled();
      });
    });

    it("renders version action for supporting documents", async () => {
      renderWithProviders(
        <ProjectAssetList projectId="01J6GZ3C000000000000000003" />,
      );

      await waitFor(() => {
        expect(screen.getAllByText("investor_deck.pdf").length).toBeGreaterThan(0);
      });

      const versionButtons = screen.getAllByRole("button", { name: /version/i });
      expect(versionButtons.length).toBeGreaterThan(0);
    });

    it("renders upload dropzone for supporting documents", async () => {
      renderWithProviders(
        <ProjectAssetList projectId="01J6GZ3C000000000000000005" />,
      );

      await waitFor(() => {
        expect(screen.getByText("Drop here")).toBeDefined();
      });
    });

    it("does not render non-verified or incomplete assets", async () => {
      currentAssets.push(
        {
          id: "asset-incomplete-1",
          project_id: "01J6GZ3C000000000000000003",
          kind: "supporting_document",
          file_name: "ComentProposal.pdf",
          media_type: "application/pdf",
          size_bytes: null as unknown as number,
          state: "pending_upload",
          created_at: "2026-09-13T10:00:00Z",
        },
        {
          id: "asset-rejected-1",
          project_id: "01J6GZ3C000000000000000003",
          kind: "supporting_document",
          file_name: "RejectedDoc.pdf",
          media_type: "application/pdf",
          size_bytes: 5000,
          state: "rejected",
          created_at: "2026-09-13T10:00:00Z",
        },
      );

      renderWithProviders(
        <ProjectAssetList projectId="01J6GZ3C000000000000000003" />,
      );

      await waitFor(() => {
        expect(screen.getAllByText("investor_deck.pdf").length).toBeGreaterThan(0);
      });

      expect(screen.queryByText("ComentProposal.pdf")).toBeNull();
      expect(screen.queryByText("RejectedDoc.pdf")).toBeNull();
      expect(screen.queryByText("null B")).toBeNull();
    });
  });
});
