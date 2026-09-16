import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionReportView } from "@/features/reports/session-report-view";
import SessionPage from "@/app/(auth)/sessions/[sessionId]/report/page";
import { apiClient } from "@/lib/api/client";
import type { Finding, PracticeSession, Report } from "@/lib/api/types";

const finding = (id: string, kind: Finding["kind"], title: string, detail: string): Finding => ({
  id, kind, title, detail, evidence_ids: [`evidence-${id}`], speaker_labels: [],
});
const mockReport: Report = {
  schema_version: 1,
  report_id: "rep-123",
  practice_session_id: "sess-456",
  evaluation_id: "eval-1",
  title: "Series A Rehearsal",
  executive_summary: "Excellent structure and strong pitch traction.",
  overall_score: 0.88,
  score_components: [],
  team_feedback: {
    summary: "Strong pitch with focused opportunities to improve.",
    strengths: [finding("s1", "strength", "Clear problem framing", "The opening established the customer need.")],
    improvements: [finding("i1", "improvement", "Tighten transitions", "Move more quickly between sections.")],
    score_components: [], limitations: [],
  },
  member_feedback: [{
    user_id: "user-1", display_name: "Alice Founder", speaker_labels: ["SPEAKER_00"],
    summary: "Confident delivery.",
    strengths: [finding("ms1", "strength", "Confident delivery pacing", "The delivery remained composed.")],
    improvements: [finding("mi1", "improvement", "Use shorter answers", "Lead with the conclusion.")],
    delivery_components: [], qa_feedback: null,
  }],
  markdown: "# Complete AI report\n\n## Evidence\n\n| Dimension | Score |\n| --- | --- |\n| Clarity | 88 |",
  transcript_timeline: [], document_alignment: [], qa_review: [],
  recommendations: ["Lead Q&A answers with the key metric."], limitations: [], reproducibility: {},
  generated_at: "2026-09-15T12:00:00Z",
};
const mockSession: PracticeSession = {
  id: "sess-456", project_id: "proj-789", name: "Series A Rehearsal", state: "completed",
  created_by: "user-1", created_at: "2026-09-15T11:00:00Z", updated_at: "2026-09-15T12:00:00Z", version: 2,
};

vi.mock("@/components/Nav-Bar", () => ({
  WorkspaceNavBar: () => <div data-testid="workspace-nav-bar" />,
}));

vi.mock("react-to-print", () => ({
  useReactToPrint: () => vi.fn(),
}));

describe("SessionReportView", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the backend report shape and scales normalized score", () => {
    render(<SessionReportView report={mockReport} session={mockSession} />);
    expect(screen.getByText(/Series A Rehearsal/)).toBeDefined();
    expect(screen.getAllByText("88").length).toBeGreaterThan(0);
    expect(screen.getByText("Alice Founder")).toBeDefined();
    expect(screen.getByText("Clear problem framing")).toBeDefined();
    expect(screen.getByRole("heading", { name: "Complete AI report" })).toBeDefined();
    expect(screen.getByText("Clarity")).toBeDefined();
  });

  it("renders the print report buttons", () => {
    render(<SessionReportView report={mockReport} session={mockSession} />);
    const printButtons = screen.getAllByRole("button", { name: /print pdf report/i });
    expect(printButtons.length).toBeGreaterThan(0);
    expect(screen.getAllByText("Print Report").length).toBeGreaterThan(0);
  });
});

describe("SessionReportPage", () => {
  it("renders a resolved report from the canonical route", async () => {
    vi.spyOn(apiClient, "getReport").mockResolvedValue(mockReport);
    vi.spyOn(apiClient, "getPracticeSession").mockResolvedValue(mockSession);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    await React.act(async () => {
      render(<QueryClientProvider client={client}><React.Suspense fallback={<div>Loading</div>}><SessionPage params={Promise.resolve({ sessionId: "sess-456" })} /></React.Suspense></QueryClientProvider>);
    });
    await waitFor(() => expect(screen.getByText("Alice Founder")).toBeDefined());
  });

  it("shows preparation instead of unavailable while final answer analysis is pending", async () => {
    vi.spyOn(apiClient, "getReport").mockRejectedValue(new Error("Report is not ready."));
    vi.spyOn(apiClient, "getPracticeSession").mockResolvedValue({
      ...mockSession,
      state: "questions_in_progress",
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    await React.act(async () => {
      render(<QueryClientProvider client={client}><React.Suspense fallback={<div>Loading</div>}><SessionPage params={Promise.resolve({ sessionId: "sess-456" })} /></React.Suspense></QueryClientProvider>);
    });

    expect(await screen.findByText("Report Preparation in Progress")).toBeDefined();
    expect(screen.queryByText("Report Unavailable")).toBeNull();
  });
});
