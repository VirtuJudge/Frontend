import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionRecordContent } from "@/app/(auth)/projects/[projectId]/session/record/page";
import { apiClient } from "@/lib/api/client";

const pushMock = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
  useSearchParams: () => mockSearchParams,
  useParams: () => ({ projectId: "01J6GZ3C000000000000000003" }),
  usePathname: () => "/projects/01J6GZ3C000000000000000003/session/record",
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(ui, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
}

describe("SessionRecordContent (/projects/:id/session/record)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.setUseMock(true);
    mockSearchParams = new URLSearchParams();

    Object.defineProperty(global.navigator, "mediaDevices", {
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn() }],
        }),
      },
      writable: true,
      configurable: true,
    });
  });

  it("renders top logo, restart button, presentation button, pause/stop pill, and timer", async () => {
    renderWithProviders(
      <SessionRecordContent projectId="01J6GZ3C000000000000000003" />,
    );

    expect(screen.getByAltText("VirtuJudge")).toBeDefined();
    expect(screen.getByRole("button", { name: /restart session/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /presentation/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /pause recording/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /end session/i })).toBeDefined();
    expect(screen.getByText("09:55")).toBeDefined();
  });

  it("stops recording, displays recorded preview, and allows download and record again", async () => {
    renderWithProviders(
      <SessionRecordContent projectId="01J6GZ3C000000000000000003" />,
    );

    const startBtn = await screen.findByRole("button", {
      name: /start recording/i,
    });
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(screen.queryByText(/recording starts in/i)).toBeNull();
    });

    const endBtn = screen.getByRole("button", { name: /end session/i });
    fireEvent.click(endBtn);

    await waitFor(() => {
      expect(screen.getByText("Recorded Preview")).toBeDefined();
    });

    expect(
      screen.getByLabelText("Recorded presentation video preview"),
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: /download video/i }),
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: /submit/i }),
    ).toBeDefined();
    expect(screen.getByRole("button", { name: /record again/i })).toBeDefined();

    const recordAgainBtn = screen.getByRole("button", { name: /record again/i });
    fireEvent.click(recordAgainBtn);

    await waitFor(() => {
      expect(screen.queryByText("Recorded Preview")).toBeNull();
    });
  });


  it("opens restart session modal on clicking restart button", async () => {
    renderWithProviders(
      <SessionRecordContent projectId="01J6GZ3C000000000000000003" />,
    );

    const restartBtn = screen.getByRole("button", { name: /restart session/i });
    fireEvent.click(restartBtn);

    expect(screen.getByText("Restart session?")).toBeDefined();
    expect(
      screen.getByText("Any data or indices in this session will be lost"),
    ).toBeDefined();

    const confirmRestartBtn = screen.getByRole("button", { name: /^restart$/i });
    fireEvent.click(confirmRestartBtn);

    expect(screen.queryByText("Restart session?")).toBeNull();
  });

  it("toggles pause and resume state", async () => {
    renderWithProviders(
      <SessionRecordContent projectId="01J6GZ3C000000000000000003" />,
    );

    const startBtn = await screen.findByRole("button", {
      name: /start recording/i,
    });
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(screen.queryByText(/recording starts in/i)).toBeNull();
    });

    const pauseBtn = screen.getByRole("button", { name: /pause recording/i });
    fireEvent.click(pauseBtn);

    const resumeBtn = screen.getByRole("button", { name: /resume recording/i });
    expect(resumeBtn).toBeDefined();

    fireEvent.click(resumeBtn);
    expect(screen.getByRole("button", { name: /pause recording/i })).toBeDefined();
  });

  it("renders without pause button and without timer text when disabled via query params", async () => {
    mockSearchParams = new URLSearchParams({
      pause: "false",
      timer: "false",
    });

    renderWithProviders(
      <SessionRecordContent projectId="01J6GZ3C000000000000000003" />,
    );

    expect(screen.queryByRole("button", { name: /pause recording/i })).toBeNull();
    expect(screen.getByRole("button", { name: /end session/i })).toBeDefined();
    expect(screen.queryByText("09:55")).toBeNull();
  });

  it("renders presentation button without opening any modal", async () => {
    renderWithProviders(
      <SessionRecordContent projectId="01J6GZ3C000000000000000003" />,
    );

    const presentationBtn = screen.getByRole("button", { name: /presentation/i });
    fireEvent.click(presentationBtn);

    expect(screen.queryByText("Presentation Slides")).toBeNull();
  });

  it("stops media tracks when ending session", async () => {
    const trackStopMock = vi.fn();
    const mockStream = {
      getTracks: () => [{ stop: trackStopMock, enabled: true }],
    };
    Object.defineProperty(global.navigator, "mediaDevices", {
      value: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream),
      },
      writable: true,
      configurable: true,
    });

    renderWithProviders(
      <SessionRecordContent projectId="01J6GZ3C000000000000000003" />,
    );

    await waitFor(() => {
      expect(global.navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
    });

    const endBtn = screen.getByRole("button", { name: /end session/i });
    fireEvent.click(endBtn);

    await waitFor(() => {
      expect(trackStopMock).toHaveBeenCalled();
    });
  });

  it("renders media permission prompt with adjust icon and address bar guidance when permissions are denied", async () => {
    Object.defineProperty(global.navigator, "mediaDevices", {
      value: {
        getUserMedia: vi.fn().mockRejectedValue(new Error("Permission denied")),
      },
      writable: true,
      configurable: true,
    });

    renderWithProviders(
      <SessionRecordContent projectId="01J6GZ3C000000000000000003" />,
    );

    await waitFor(() => {
      expect(screen.getByText("Camera and microphone are blocked")).toBeDefined();
    });

    expect(screen.getByText(/in your address bar/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /try again/i })).toBeDefined();
    expect(
      screen.getByRole("button", { name: /edit configurations/i }),
    ).toBeDefined();
  });

  it("navigates back to session prepare when clicking Edit Configurations from permission prompt", async () => {
    Object.defineProperty(global.navigator, "mediaDevices", {
      value: {
        getUserMedia: vi.fn().mockRejectedValue(new Error("Permission denied")),
      },
      writable: true,
      configurable: true,
    });

    renderWithProviders(
      <SessionRecordContent projectId="01J6GZ3C000000000000000003" />,
    );

    const backBtn = await screen.findByRole("button", {
      name: /edit configurations/i,
    });
    fireEvent.click(backBtn);

    expect(pushMock).toHaveBeenCalledWith(
      "/projects/01J6GZ3C000000000000000003/session/prepare",
    );
  });

  it("retries permission request when clicking Try Again", async () => {
    const getUserMediaMock = vi.fn().mockRejectedValueOnce(new Error("Permission denied")).mockResolvedValueOnce({
      getTracks: () => [{ stop: vi.fn() }],
    });

    Object.defineProperty(global.navigator, "mediaDevices", {
      value: {
        getUserMedia: getUserMediaMock,
      },
      writable: true,
      configurable: true,
    });

    renderWithProviders(
      <SessionRecordContent projectId="01J6GZ3C000000000000000003" />,
    );

    const retryBtn = await screen.findByRole("button", { name: /try again/i });
    fireEvent.click(retryBtn);

    expect(getUserMediaMock).toHaveBeenCalledTimes(2);
  });

  it("does not restart recording or overwrite preview on re-renders once stopped", async () => {
    const getUserMediaMock = vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    });

    Object.defineProperty(global.navigator, "mediaDevices", {
      value: { getUserMedia: getUserMediaMock },
      writable: true,
      configurable: true,
    });

    const { rerender } = renderWithProviders(
      <SessionRecordContent projectId="01J6GZ3C000000000000000003" />,
    );

    const startBtn = await screen.findByRole("button", {
      name: /start recording/i,
    });
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(screen.queryByText(/recording starts in/i)).toBeNull();
    });

    expect(getUserMediaMock).toHaveBeenCalledTimes(1);

    const endBtn = screen.getByRole("button", { name: /end session/i });
    fireEvent.click(endBtn);

    await waitFor(() => {
      expect(screen.getByText("Recorded Preview")).toBeDefined();
    });

    // Simulate component re-rendering (e.g. state change, HMR, or parent re-render)
    rerender(
      <SessionRecordContent projectId="01J6GZ3C000000000000000003" />,
    );

    // Should NOT have called getUserMedia again
    expect(getUserMediaMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Recorded Preview")).toBeDefined();
  });

  it("opens confirmation modal on ready, runs 3, 2, 1 countdown after confirmation, then starts recording", async () => {
    renderWithProviders(
      <SessionRecordContent projectId="01J6GZ3C000000000000000003" />,
    );

    expect(
      await screen.findByText("Start recording session?"),
    ).toBeDefined();
    expect(
      screen.getByText(/once you confirm, a 3-second countdown will begin/i),
    ).toBeDefined();

    const startBtn = screen.getByRole("button", { name: /start recording/i });
    fireEvent.click(startBtn);

    // Countdown overlay appears
    expect(screen.getByText(/recording starts in/i)).toBeDefined();

    // After countdown completes
    await waitFor(() => {
      expect(screen.queryByText(/recording starts in/i)).toBeNull();
    });

    // Recording is now live
    expect(screen.getByRole("button", { name: /end session/i })).toBeDefined();
  });
});
