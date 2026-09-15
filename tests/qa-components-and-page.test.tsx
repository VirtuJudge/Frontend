import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import {
  QuestionCard,
  AudioPlayer,
  QAStepper,
  SkipQuestionModal,
  QAAnalyzingCard,
  QACompletedCard,
} from "@/features/qa";
import SessionQAPage from "@/app/(auth)/sessions/[sessionId]/qa/page";
import { Question, QARound, PracticeSession } from "@/lib/api/types";

async function renderWithQuery(ui: React.ReactElement) {
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
      </QueryClientProvider>
    );
  });
  return result!;
}

const mockPrimaryQuestion: Question = {
  id: "q-1",
  practice_session_id: "sess-1",
  kind: "primary",
  position: 1,
  text: "How do you plan to scale your customer acquisition?",
  reason: "High CAC was noted without clear viral loops",
  rubric_dimension: "business_model",
  evidence_ids: ["ev-1"],
  state: "active",
};

const mockFollowUpQuestion: Question = {
  id: "q-4",
  practice_session_id: "sess-1",
  kind: "follow_up",
  position: 1,
  text: "Can you provide specific conversion benchmarks?",
  reason: "Clarifying earlier answer on sales funnel",
  rubric_dimension: "business_model",
  evidence_ids: ["ev-1", "ans-1"],
  parent_answer_id: "ans-1",
  state: "active",
};

describe("FE-05 QA Feature Components", () => {
  it("QuestionCard renders primary question with dimension and rationale", () => {
    render(
      <QuestionCard
        question={mockPrimaryQuestion}
        questionIndex={1}
        totalQuestions={3}
      />
    );

    expect(screen.getByText("Primary Question")).toBeDefined();
    expect(screen.getByText("Business Model")).toBeDefined();
    expect(screen.getByText("Question 1 of 3")).toBeDefined();
    expect(
      screen.getByText("How do you plan to scale your customer acquisition?")
    ).toBeDefined();
    expect(
      screen.getByText("High CAC was noted without clear viral loops")
    ).toBeDefined();
  });

  it("QuestionCard renders follow-up question with parent citation context", () => {
    render(
      <QuestionCard
        question={mockFollowUpQuestion}
        questionIndex={4}
        totalQuestions={4}
      />
    );

    expect(screen.getByText("Adaptive Follow-up")).toBeDefined();
    expect(
      screen.getByText("Can you provide specific conversion benchmarks?")
    ).toBeDefined();
    expect(
      screen.getByText(/This question was adaptively generated based on your earlier response/)
    ).toBeDefined();
  });

  it("AudioPlayer renders play button, scrub bar, and duration", () => {
    render(
      <AudioPlayer
        src="blob:http://localhost/test-audio"
        durationMs={65000}
      />
    );

    const playBtn = screen.getByRole("button", { name: /play audio draft/i });
    expect(playBtn).toBeDefined();
    expect(screen.getByLabelText("Seek audio")).toBeDefined();
    expect(screen.getByText("01:05")).toBeDefined();
  });

  it("QAStepper renders all steps with active, answered, and pending states", () => {
    const questions: Question[] = [
      { ...mockPrimaryQuestion, id: "q-1", state: "answered" },
      { ...mockPrimaryQuestion, id: "q-2", position: 2, state: "active" },
      { ...mockPrimaryQuestion, id: "q-3", position: 3, state: "pending" },
    ];

    render(<QAStepper questions={questions} activeQuestionId="q-2" />);

    expect(screen.getByText("Question 1")).toBeDefined();
    expect(screen.getByText("Question 2")).toBeDefined();
    expect(screen.getByText("Question 3")).toBeDefined();
  });

  it("SkipQuestionModal opens, explains zero score, and confirms with reason", async () => {
    const onConfirmMock = vi.fn();
    const onCloseMock = vi.fn();

    render(
      <SkipQuestionModal
        isOpen={true}
        questionNumber={2}
        onClose={onCloseMock}
        onConfirm={onConfirmMock}
      />
    );

    expect(screen.getByText("Skip Question 2?")).toBeDefined();
    expect(screen.getByText("zero points")).toBeDefined();

    const textarea = screen.getByPlaceholderText(/Not covered in current pitch scope/i);
    fireEvent.change(textarea, { target: { value: "Deferred to demo" } });

    const confirmBtn = screen.getByRole("button", { name: /Skip Question/i });
    fireEvent.click(confirmBtn);

    expect(onConfirmMock).toHaveBeenCalledWith("Deferred to demo");
  });

  it("QAAnalyzingCard displays analysis message", () => {
    render(<QAAnalyzingCard />);
    expect(screen.getByText("Analyzing Your Answer")).toBeDefined();
    expect(screen.getByText(/VirtuJudge AI is transcribing your audio/i)).toBeDefined();
  });

  it("QACompletedCard displays completion summary and report link", () => {
    const questions: Question[] = [
      { ...mockPrimaryQuestion, id: "q-1", state: "answered" },
      { ...mockPrimaryQuestion, id: "q-2", state: "answered" },
      { ...mockPrimaryQuestion, id: "q-3", state: "skipped" },
    ];

    render(
      <QACompletedCard
        sessionId="sess-100"
        projectId="proj-100"
        questions={questions}
        answers={[]}
      />
    );

    expect(screen.getByText("Q&A Round Completed!")).toBeDefined();
    expect(screen.getByText("View Final Report")).toBeDefined();
    expect(screen.getByText("Project Home")).toBeDefined();
  });
});

describe("SessionQAPage integration", () => {
  const mockRound: QARound = {
    id: "round-1",
    practice_session_id: "sess-123",
    state: "in_progress",
    questions: [mockPrimaryQuestion],
    answers: [],
    current_question_id: "q-1",
    follow_up_count: 0,
    version: 1,
  };

  const mockSession: PracticeSession = {
    id: "sess-123",
    project_id: "proj-123",
    team_id: "team-123",
    name: "Demo Day Pitch",
    state: "questions_ready",
    version: 1,
    manifest_frozen: true,
    presentation_asset_id: "pres-1",
    document_asset_ids: [],
    stages: [],
    limitations: [],
    created_by: "user-1",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(apiClient, "getQARound").mockResolvedValue(mockRound);
    vi.spyOn(apiClient, "getPracticeSession").mockResolvedValue(mockSession);

    Object.defineProperty(global.navigator, "mediaDevices", {
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn(), readyState: "live", enabled: true }],
        }),
      },
      writable: true,
      configurable: true,
    });
  });

  it("renders full page matching the two-screen stage design", async () => {
    await renderWithQuery(
      <SessionQAPage params={Promise.resolve({ sessionId: "sess-123" })} />
    );

    expect(await screen.findByText("A judge is asking...")).toBeDefined();
    expect(
      screen.getByText("How do you plan to scale your customer acquisition?")
    ).toBeDefined();
    expect(screen.getByText("Judges Questions")).toBeDefined();
    expect(screen.getByRole("button", { name: /Start recording answer/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Restart \/ Re-record answer/i })).toBeDefined();
  });
});
