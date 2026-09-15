import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionReportView } from "@/features/reports/session-report-view";
import SessionPage from "@/app/(auth)/sessions/[sessionId]/report/page";
import { apiClient } from "@/lib/api/client";
import { Report, PracticeSession } from "@/lib/api/types";

const mockReport: Report = {
  id: "rep-123",
  session_id: "sess-456",
  status: "ready",
  team_score: 88,
  team_feedback: "Excellent structure and strong pitch traction, but Q&A delivery needs tighter focus.",
  member_feedback: [
    {
      speaker_id: "SPEAKER_00",
      score: 92,
      strengths: ["Clear problem framing", "Confident delivery pacing"],
      areas_for_improvement: ["Avoid pacing back and forth during transition"],
      transcript_citations: ["Our market opportunity reaches 12 billion dollars by 2028."],
    },
    {
      speaker_id: "SPEAKER_01",
      score: 84,
      strengths: ["Detailed financial breakdown", "Strong unit economics explanation"],
      areas_for_improvement: ["Shorten slide explanation to keep within the 2 minute window"],
      transcript_citations: ["Our CAC currently trends downwards at 14 dollars per acquisition."],
    },
  ],
  created_at: "2026-09-15T12:00:00Z",
  pdf_download_url: "https://storage.example.com/reports/rep-123.pdf",
};

const mockSession: PracticeSession = {
  id: "sess-456",
  project_id: "proj-789",
  team_id: "team-123",
  name: "Series A Rehearsal",
  state: "completed",
  manifest_frozen: true,
  presentation_asset_id: "asset-1",
  document_asset_ids: [],
  stages: [],
  limitations: [],
  created_by: "user-1",
  created_at: "2026-09-15T11:00:00Z",
  updated_at: "2026-09-15T12:00:00Z",
  version: 2,
};

describe("SessionReportView Component", () => {
  it("renders team overall score, status badge, and feedback", () => {
    render(<SessionReportView report={mockReport} session={mockSession} />);

    expect(screen.getByText("Series A Rehearsal")).toBeDefined();
    expect(screen.getByText("88")).toBeDefined();
    expect(screen.getByText(/Excellent structure and strong pitch traction/i)).toBeDefined();
    expect(screen.getByText("Evaluation Complete")).toBeDefined();
  });

  it("renders individual presenter feedback cards with strengths, improvements, and citations", () => {
    render(<SessionReportView report={mockReport} session={mockSession} />);

    expect(screen.getByText("Speaker SPEAKER_00")).toBeDefined();
    expect(screen.getByText("92")).toBeDefined();
    expect(screen.getByText("Clear problem framing")).toBeDefined();
    expect(screen.getByText("Avoid pacing back and forth during transition")).toBeDefined();
    expect(screen.getByText(/12 billion dollars by 2028/i)).toBeDefined();

    expect(screen.getByText("Speaker SPEAKER_01")).toBeDefined();
    expect(screen.getByText("84")).toBeDefined();
    expect(screen.getByText("Detailed financial breakdown")).toBeDefined();
    expect(screen.getByText(/14 dollars per acquisition/i)).toBeDefined();
  });

  it("triggers direct PDF link download when pdf_download_url is available", () => {
    render(<SessionReportView report={mockReport} session={mockSession} />);

    const downloadBtn = screen.getByRole("button", { name: /download pdf/i });
    expect(downloadBtn).toBeDefined();

    const appendSpy = vi.spyOn(document.body, "appendChild");
    fireEvent.click(downloadBtn);

    expect(appendSpy).toHaveBeenCalled();
  });

  it("falls back to window.print when pdf_download_url is omitted", () => {
    const reportWithoutPdf: Report = {
      ...mockReport,
      pdf_download_url: undefined,
    };

    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
    render(<SessionReportView report={reportWithoutPdf} session={mockSession} />);

    const downloadBtn = screen.getByRole("button", { name: /download pdf/i });
    fireEvent.click(downloadBtn);

    expect(printSpy).toHaveBeenCalled();
    printSpy.mockRestore();
  });

  it("invokes onRefresh callback when Refresh button is clicked", () => {
    const handleRefresh = vi.fn();
    render(
      <SessionReportView
        report={mockReport}
        session={mockSession}
        onRefresh={handleRefresh}
      />,
    );

    const refreshBtn = screen.getByRole("button", { name: /refresh report/i });
    fireEvent.click(refreshBtn);

    expect(handleRefresh).toHaveBeenCalledTimes(1);
  });
});

describe("SessionPage Route Integration", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  it("renders loading state while report is loading", async () => {
    vi.spyOn(apiClient, "getReport").mockImplementation(
      () => new Promise(() => {}),
    );
    vi.spyOn(apiClient, "getPracticeSession").mockImplementation(
      () => new Promise(() => {}),
    );

    await React.act(async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <React.Suspense fallback={<div>Loading suspense...</div>}>
            <SessionPage params={Promise.resolve({ sessionId: "sess-456" })} />
          </React.Suspense>
        </QueryClientProvider>,
      );
    });

    expect(screen.getByText(/loading session report/i)).toBeDefined();
  });

  it("renders report view when report query resolves", async () => {
    vi.spyOn(apiClient, "getReport").mockResolvedValue(mockReport);
    vi.spyOn(apiClient, "getPracticeSession").mockResolvedValue(mockSession);

    await React.act(async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <React.Suspense fallback={<div>Loading suspense...</div>}>
            <SessionPage params={Promise.resolve({ sessionId: "sess-456" })} />
          </React.Suspense>
        </QueryClientProvider>,
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Series A Rehearsal")).toBeDefined();
      expect(screen.getByText("88")).toBeDefined();
    });
  });

  it("renders error/retry view when report query fails", async () => {
    vi.spyOn(apiClient, "getReport").mockRejectedValue(
      new Error("Report not generated yet"),
    );
    vi.spyOn(apiClient, "getPracticeSession").mockResolvedValue(mockSession);

    await React.act(async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <React.Suspense fallback={<div>Loading suspense...</div>}>
            <SessionPage params={Promise.resolve({ sessionId: "sess-456" })} />
          </React.Suspense>
        </QueryClientProvider>,
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/report unavailable/i)).toBeDefined();
      expect(screen.getByRole("button", { name: /try again/i })).toBeDefined();
    });
  });
});
