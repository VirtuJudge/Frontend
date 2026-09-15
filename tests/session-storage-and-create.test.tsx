import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as nextNavigation from "next/navigation";
import { apiClient } from "@/lib/api/client";
import {
  saveSessionConfig,
  getSessionConfig,
  clearSessionConfig,
  savePresentationVideo,
  getSessionConfigBySessionId,
} from "@/lib/storage/session-storage";
import PrepareSessionPage from "@/app/(auth)/projects/[projectId]/session/prepare/page";
import { SessionRecordContent } from "@/app/(auth)/projects/[projectId]/session/record/page";

const mockProjectId = "proj-test-456";
const mockSessionId = "sess-test-789";

async function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  let result: ReturnType<typeof render>;
  await React.act(async () => {
    result = render(
      <QueryClientProvider client={queryClient}>
        <React.Suspense fallback={<div>Loading suspense...</div>}>
          {ui}
        </React.Suspense>
      </QueryClientProvider>,
    );
  });
  return result!;
}

describe("Session Configuration in LocalStorage and Session Flow", () => {
  const pushMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    clearSessionConfig(mockProjectId);
    vi.spyOn(apiClient, "createUploadIntent").mockResolvedValue({
      asset_id: "asset-rec-1",
      version_id: "ver-rec-1",
      upload_url: "",
      method: "PUT",
      expires_at: new Date().toISOString(),
      required_headers: {},
      maximum_size_bytes: 1024 * 1024 * 50,
    });
    vi.spyOn(apiClient, "completeUpload").mockResolvedValue({
      id: "asset-rec-1",
      project_id: mockProjectId,
      kind: "presentation_video",
      file_name: "recorded-presentation.webm",
      media_type: "video/webm",
      size_bytes: 1024,
      state: "verified",
      checksum: "sha256:dummy",
      created_at: new Date().toISOString(),
    });
    vi.spyOn(apiClient, "createPracticeSession").mockResolvedValue({
      id: "sess-123",
      project_id: mockProjectId,
      team_id: "team-1",
      state: "ready",
      manifest_frozen: false,
      presentation_asset_id: "asset-rec-1",
      document_asset_ids: [],
      stages: [],
      limitations: [],
      created_by: "user-1",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
    });
    vi.spyOn(apiClient, "createAnalysisAttempt").mockResolvedValue({
      id: "attempt-1",
      session_id: "sess-123",
      status: "queued",
      created_at: new Date().toISOString(),
      attempt_number: 1,
      version: 1,
    });
    vi.spyOn(apiClient, "getPracticeSession").mockResolvedValue({
      id: "sess-test-789",
      project_id: mockProjectId,
      team_id: "team-1",
      state: "ready",
      manifest_frozen: false,
      presentation_asset_id: "asset-rec-1",
      document_asset_ids: [],
      stages: [],
      limitations: [],
      created_by: "user-1",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
    });

    Object.defineProperty(global.navigator, "mediaDevices", {
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn(), readyState: "live", enabled: true }],
        }),
      },
      writable: true,
      configurable: true,
    });

    vi.spyOn(nextNavigation, "useRouter").mockReturnValue({
      push: pushMock,
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    } as unknown as ReturnType<typeof nextNavigation.useRouter>);

    vi.spyOn(nextNavigation, "useSearchParams").mockReturnValue({
      get: vi.fn(() => null),
    } as unknown as ReturnType<typeof nextNavigation.useSearchParams>);
  });

  describe("session-storage unit tests", () => {
    it("saves and retrieves full session configurations keyed by projectId", () => {
      const config = saveSessionConfig(mockProjectId, {
        projectId: mockProjectId,
        discussionPanel: false,
        showTimer: true,
        allowPauses: false,
        presentationDuration: 400,
        presentationMinutes: 6,
        presentationSeconds: 40,
        questionsDuration: 250,
        questionsMinutes: 4,
        questionsSeconds: 10,
        selectedAssets: [
          {
            id: "asset-1",
            assetId: "asset-1",
            versionId: "ver-1",
            name: "pitch.pdf",
            size: 1024,
            type: "application/pdf",
          },
        ],
      });

      expect(config.discussionPanel).toBe(false);
      expect(config.showTimer).toBe(true);
      expect(config.allowPauses).toBe(false);
      expect(config.presentationDuration).toBe(400);
      expect(config.selectedAssets).toHaveLength(1);

      // Verify retrieval directly via getSessionConfig
      const retrieved = getSessionConfig(mockProjectId);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.discussionPanel).toBe(false);
      expect(retrieved?.showTimer).toBe(true);
      expect(retrieved?.allowPauses).toBe(false);
      expect(retrieved?.presentationDuration).toBe(400);
      expect(retrieved?.selectedAssets[0].name).toBe("pitch.pdf");

      // Verify stored in localStorage directly under mockProjectId key
      const raw = window.localStorage.getItem(mockProjectId);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed.discussionPanel).toBe(false);
      expect(parsed.selectedAssets[0].name).toBe("pitch.pdf");
    });

    it("saves presentation video link and asset details to localStorage", () => {
      saveSessionConfig(mockProjectId, {
        projectId: mockProjectId,
        discussionPanel: true,
      });

      const updated = savePresentationVideo(mockProjectId, {
        videoUrl: "blob:http://localhost/video-123",
        link: "https://storage.virtujudge.local/video-123.webm",
        assetId: "asset-video-1",
        versionId: "version-video-1",
        fileName: "pitch-recording.webm",
      });

      expect(updated.presentationVideo?.videoUrl).toBe(
        "blob:http://localhost/video-123",
      );
      expect(updated.presentationVideo?.assetId).toBe("asset-video-1");
      expect(updated.presentationVideo?.versionId).toBe("version-video-1");

      const retrieved = getSessionConfig(mockProjectId);
      expect(retrieved?.presentationVideo?.fileName).toBe("pitch-recording.webm");
    });
  });

  describe("PrepareSessionPage saving to localStorage", () => {
    it("saves configurations to localStorage when Start is clicked", async () => {
      await renderWithProviders(
        <PrepareSessionPage
          params={Promise.resolve({ projectId: mockProjectId })}
        />,
      );

      const startBtn = await screen.findByRole("button", { name: /^start$/i });
      fireEvent.click(startBtn);

      await waitFor(() => {
        expect(pushMock).toHaveBeenCalledWith(
          expect.stringContaining(`/projects/${mockProjectId}/session/record`),
        );
      });

      // Verify localStorage is populated under mockProjectId
      const saved = getSessionConfig(mockProjectId);
      expect(saved).not.toBeNull();
      expect(saved?.projectId).toBe(mockProjectId);
      expect(typeof saved?.discussionPanel).toBe("boolean");
      expect(typeof saved?.showTimer).toBe("boolean");
      expect(typeof saved?.allowPauses).toBe("boolean");
      expect(typeof saved?.presentationDuration).toBe("number");
      expect(typeof saved?.questionsDuration).toBe("number");
    });

    it("automatically applies configuration updates to localStorage immediately on change without clicking Start", async () => {
      await renderWithProviders(
        <PrepareSessionPage
          params={Promise.resolve({ projectId: mockProjectId })}
        />,
      );

      // Verify initially saved to localStorage
      await waitFor(() => {
        const initial = getSessionConfig(mockProjectId);
        expect(initial).not.toBeNull();
        expect(initial?.discussionPanel).toBe(true);
      });

      // Toggle Discussion panel switch
      const discussionToggle = screen.getByRole("switch", { name: /discussion panel/i });
      fireEvent.click(discussionToggle);

      // Verify localStorage is updated immediately without clicking Start!
      await waitFor(() => {
        const updated = getSessionConfig(mockProjectId);
        expect(updated?.discussionPanel).toBe(false);
      });
    });
  });

  describe("SessionRecordContent submitting and creating session", () => {
    it("submits video, creates practice session via API, and navigates to session/:id", async () => {
      // 1. Pre-seed localStorage configuration for mockProjectId
      saveSessionConfig(mockProjectId, {
        projectId: mockProjectId,
        discussionPanel: true,
        showTimer: true,
        allowPauses: true,
        presentationDuration: 300,
        selectedAssets: [
          {
            id: "asset-deck-1",
            assetId: "asset-deck-1",
            versionId: "ver-deck-1",
            name: "slides.pdf",
            size: 2048,
          },
        ],
      });

      const createSessionSpy = vi.spyOn(apiClient, "createPracticeSession");

      await renderWithProviders(<SessionRecordContent projectId={mockProjectId} />);

      // Start recording
      const startBtn = await screen.findByRole("button", {
        name: /start recording/i,
      });
      fireEvent.click(startBtn);

      await waitFor(() => {
        expect(screen.queryByLabelText(/recording starts in/i)).toBeNull();
      });

      // Stop recording
      const endBtn = screen.getByRole("button", { name: /end session/i });
      fireEvent.click(endBtn);

      await waitFor(() => {
        expect(screen.getByText("Recorded Preview")).toBeDefined();
      });

      // Check preview and click Submit
      const submitBtn = screen.getByRole("button", { name: /submit/i });
      expect(submitBtn).toBeDefined();

      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(createSessionSpy).toHaveBeenCalledWith(
          mockProjectId,
          expect.objectContaining({
            presentation_asset_id: expect.any(String),
            document_asset_ids: expect.any(Array),
          }),
          expect.any(String),
        );
      });

      // Verify router navigated to sessions/:id/qa
      await waitFor(() => {
        expect(pushMock).toHaveBeenCalledWith("/sessions/sess-123/qa");
      });

      // Verify localStorage now holds sessionId and presentationVideo
      const finalConfig = getSessionConfig(mockProjectId);
      expect(finalConfig?.sessionId).toBeDefined();
      expect(finalConfig?.presentationVideo?.videoUrl).toBeDefined();
    });
  });

  describe("Session config lookup by sessionId", () => {
    it("renders session details and stored configurations", () => {
      saveSessionConfig(mockProjectId, {
        projectId: mockProjectId,
        sessionId: mockSessionId,
        discussionPanel: true,
        showTimer: true,
        allowPauses: true,
        presentationDuration: 390,
        questionsDuration: 300,
        selectedAssets: [
          {
            id: "asset-1",
            name: "PitchDeck.pdf",
            size: 1024,
            type: "application/pdf",
          },
        ],
        presentationVideo: {
          videoUrl: "blob:http://localhost/pitch-preview",
          fileName: "pitch-recording.webm",
        },
      });

      const config = getSessionConfigBySessionId(mockSessionId);
      expect(config).toBeDefined();
      expect(config?.selectedAssets[0].name).toBe("PitchDeck.pdf");
      expect(config?.discussionPanel).toBe(true);
      expect(config?.showTimer).toBe(true);
      expect(config?.allowPauses).toBe(true);
      expect(config?.presentationDuration).toBe(390);
      expect(config?.presentationVideo?.fileName).toBe("pitch-recording.webm");
    });
  });
});
