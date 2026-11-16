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
  QAStageView,
} from "@/features/qa";
import { useQAMutations } from "@/hooks/qa/use-qa-mutations";
import { renderHook, act } from "@testing-library/react";
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
        questions={questions}
        answers={[]}
      />
    );

    expect(screen.getByText("Q&A Round Completed!")).toBeDefined();
    expect(screen.getByText("View Report")).toBeDefined();
    expect(screen.getByText("Map Presenters")).toBeDefined();
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

  it("keeps the final answer in analysis until the backend completes the round", async () => {
    vi.spyOn(apiClient, "getQARound").mockResolvedValue({
      ...mockRound,
      current_question_id: null,
      questions: [1, 2, 3].map((position) => ({
        ...mockPrimaryQuestion,
        id: `q-${position}`,
        position,
        state: "answered",
      })),
    });
    vi.spyOn(apiClient, "getPracticeSession").mockResolvedValue({
      ...mockSession,
      state: "questions_in_progress",
    });

    await renderWithQuery(
      <SessionQAPage params={Promise.resolve({ sessionId: "sess-123" })} />
    );

    expect(await screen.findByText("Analyzing Your Answer")).toBeDefined();
    expect(screen.queryByText("Q&A Round Completed!")).toBeNull();
  });
});

describe("QAStageView & useQAMutations - Question Binding and Transitions (#107)", () => {
  const q1: Question = {
    ...mockPrimaryQuestion,
    id: "q-1",
    position: 1,
    text: "Question 1 text",
    state: "active",
  };

  const q2: Question = {
    ...mockPrimaryQuestion,
    id: "q-2",
    position: 2,
    text: "Question 2 text",
    state: "active",
  };

  beforeEach(() => {
    vi.clearAllMocks();
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

  it("stops active recording and clears draft when active question changes remotely", async () => {
    const onSubmitDraft = vi.fn().mockResolvedValue(true);
    const onSkipQuestion = vi.fn().mockResolvedValue(true);
    const onNavigateBack = vi.fn();

    const { rerender } = render(
      <QAStageView
        questions={[q1, q2]}
        activeQuestion={q1}
        currentQuestionNumber={1}
        onSubmitDraft={onSubmitDraft}
        onSkipQuestion={onSkipQuestion}
        onNavigateBack={onNavigateBack}
      />
    );

    expect(screen.getByText("Question 1 text")).toBeDefined();

    // Start recording for q1
    const recordBtn = screen.getByRole("button", { name: /start recording answer/i });
    await React.act(async () => {
      fireEvent.click(recordBtn);
    });

    // Verify recording state: "Judges are listening"
    expect(screen.getByText("Judges are listening")).toBeDefined();

    // Canonical activeQuestion remotely advances to q2
    await React.act(async () => {
      rerender(
        <QAStageView
          questions={[q1, q2]}
          activeQuestion={q2}
          currentQuestionNumber={2}
          onSubmitDraft={onSubmitDraft}
          onSkipQuestion={onSkipQuestion}
          onNavigateBack={onNavigateBack}
        />
      );
    });

    // Recording is stopped, draft discarded, and screen returns to initial asking state for q2
    expect(screen.getByText("Question 2 text")).toBeDefined();
    expect(screen.getByText("A judge is asking...")).toBeDefined();
    expect(screen.queryByText("Judges are listening")).toBeNull();
    expect(screen.queryByText("Review Your Answer")).toBeNull();
  });

  it("useQAMutations rejects submitting a draft bound to a different question", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const setAnalyzingQuestionId = vi.fn();

    const { result } = renderHook(() =>
      useQAMutations("sess-1", q2, setAnalyzingQuestionId, queryClient)
    );

    const draftForQ1 = {
      blob: new Blob(["dummy audio"], { type: "audio/webm" }),
      url: "blob:http://localhost/test",
      durationMs: 5000,
      mimeType: "audio/webm",
      sizeBytes: 1000,
      questionId: "q-1", // Recorded for q1, but activeQuestion is q2
    };

    let submitted = false;
    await act(async () => {
      submitted = await result.current.submitAnswer(draftForQ1);
    });

    expect(submitted).toBe(false);
    expect(result.current.actionError).toContain(
      "The recorded answer belongs to a different question"
    );
  });
});
