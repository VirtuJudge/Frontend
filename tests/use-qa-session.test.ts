import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useQASession } from "@/features/qa/hooks/use-qa-session";
import { QARound, Question } from "@/lib/api/types";
import * as directUploader from "@/lib/upload/direct-uploader";
import * as checksumUtil from "@/lib/upload/checksum";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );
  Wrapper.displayName = "TestQueryWrapper";
  return Wrapper;
}

const mockQuestions: Question[] = [
  {
    id: "q-1",
    practice_session_id: "sess-1",
    kind: "primary",
    position: 1,
    text: "Can you clarify your customer acquisition cost?",
    reason: "Unit economics were ungrounded in slide 4",
    rubric_dimension: "business_model",
    evidence_ids: ["ev-1"],
    state: "active",
  },
  {
    id: "q-2",
    practice_session_id: "sess-1",
    kind: "primary",
    position: 2,
    text: "How does your solution defend against incumbents?",
    reason: "Moat was weakly articulated",
    rubric_dimension: "competition",
    evidence_ids: ["ev-2"],
    state: "pending",
  },
  {
    id: "q-3",
    practice_session_id: "sess-1",
    kind: "primary",
    position: 3,
    text: "What are your key milestone metrics for year 1?",
    reason: "Roadmap was vague",
    rubric_dimension: "roadmap",
    evidence_ids: ["ev-3"],
    state: "pending",
  },
  // Extra primary question to test invariant limit (must be capped at 3)
  {
    id: "q-4",
    practice_session_id: "sess-1",
    kind: "primary",
    position: 4,
    text: "Unwanted fourth primary question",
    reason: "Should be dropped by UI invariant",
    rubric_dimension: "extra",
    evidence_ids: ["ev-4"],
    state: "pending",
  },
];

const mockQARound: QARound = {
  id: "qa-round-1",
  practice_session_id: "sess-1",
  state: "in_progress",
  questions: mockQuestions,
  answers: [],
  current_question_id: "q-1",
  follow_up_count: 0,
  version: 1,
};

describe("useQASession hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(apiClient, "getQARound").mockResolvedValue(mockQARound);
    vi.spyOn(apiClient, "getPracticeSession").mockResolvedValue({
      id: "sess-1",
      project_id: "proj-1",
      team_id: "team-1",
      name: "Test Practice Session",
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
    });

    vi.spyOn(apiClient, "createAnswerUploadIntent").mockResolvedValue({
      answer: {
        id: "ans-1",
        question_id: "q-1",
        answered_by: "user-1",
        status: "draft",
      },
      upload_intent: {
        asset_id: "asset-ans-1",
        version_id: "ver-ans-1",
        upload_url: "https://s3.example.com/answer-upload",
        method: "PUT",
        expires_at: new Date().toISOString(),
        required_headers: {},
        maximum_size_bytes: 25 * 1024 * 1024,
      },
    });

    vi.spyOn(directUploader, "uploadFileDirectly").mockResolvedValue(undefined);
    vi.spyOn(checksumUtil, "computeFileChecksum").mockResolvedValue("sha256:dummyhash");
    vi.spyOn(apiClient, "submitAnswer").mockResolvedValue({
      id: "ans-1",
      question_id: "q-1",
      answered_by: "user-1",
      status: "submitted",
      submitted_at: new Date().toISOString(),
    });

    vi.spyOn(apiClient, "skipAnswer").mockResolvedValue({
      id: "ans-skip-1",
      question_id: "q-1",
      answered_by: "user-1",
      status: "skipped",
      submitted_at: new Date().toISOString(),
    });
  });

  it("loads Q&A round and enforces the 3-primary-question invariant", async () => {
    const { result } = renderHook(() => useQASession("sess-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.qaRound).not.toBeNull();
    });

    // Verify exactly 3 primary questions even though mock had 4
    expect(result.current.primaryQuestions).toHaveLength(3);
    expect(result.current.allQuestions).toHaveLength(3);
    expect(result.current.activeQuestion?.id).toBe("q-1");
    expect(result.current.currentQuestionNumber).toBe(1);
  });

  it("handles answer submission flow with upload intent and completion", async () => {
    const { result } = renderHook(() => useQASession("sess-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.activeQuestion).not.toBeNull();
    });

    const mockDraft = {
      blob: new Blob(["audio-bytes"], { type: "audio/webm" }),
      url: "blob:http://localhost/audio-draft",
      durationMs: 45000,
      mimeType: "audio/webm",
      sizeBytes: 1024,
    };

    let success = false;
    await act(async () => {
      success = await result.current.submitAnswer(mockDraft);
    });

    expect(success).toBe(true);
    expect(apiClient.createAnswerUploadIntent).toHaveBeenCalledWith(
      "q-1",
      expect.objectContaining({
        declared_media_type: "audio/webm",
      }),
      expect.stringContaining("answer-intent")
    );
    expect(directUploader.uploadFileDirectly).toHaveBeenCalled();
    expect(apiClient.submitAnswer).toHaveBeenCalledWith(
      "ans-1",
      expect.objectContaining({
        checksum: "sha256:dummyhash",
        size_bytes: 1024,
      }),
      expect.stringContaining("answer-submit")
    );
    expect(result.current.isAnalyzing).toBe(true);
  });

  it("handles question skip flow with reason", async () => {
    const { result } = renderHook(() => useQASession("sess-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.activeQuestion).not.toBeNull();
    });

    let success = false;
    await act(async () => {
      success = await result.current.skipQuestion("Team chose to pass on this question");
    });

    expect(success).toBe(true);
    expect(apiClient.skipAnswer).toHaveBeenCalledWith(
      "q-1",
      expect.stringContaining("answer-skip"),
      "Team chose to pass on this question"
    );
    expect(result.current.isAnalyzing).toBe(true);
  });

  it("does not request Q&A while the session is still analyzing", async () => {
    vi.mocked(apiClient.getPracticeSession).mockResolvedValue({
      id: "sess-1",
      project_id: "proj-1",
      state: "analyzing",
      version: 2,
      created_by: "user-1",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    vi.mocked(apiClient.getQARound).mockClear();

    const { result } = renderHook(() => useQASession("sess-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.practiceSession?.state).toBe("analyzing"));
    expect(apiClient.getQARound).not.toHaveBeenCalled();
    expect(result.current.isError).toBe(false);
  });
});
