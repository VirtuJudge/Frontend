"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useSessionEvents } from "@/hooks/use-session-events";
import {
  QARound,
  Question,
  Answer,
  PracticeSession,
  AnalysisProgressedEvent,
} from "@/lib/api/types";
import { generateIdempotencyKey } from "@/lib/upload/idempotency";
import { uploadFileDirectly } from "@/lib/upload/direct-uploader";
import { computeFileChecksum } from "@/lib/upload/checksum";
import { AudioRecordingDraft } from "./use-audio-recorder";

export interface SubmitAnswerProgress {
  stage: string;
  percent: number;
}

export interface UseQASessionReturn {
  // Queries
  qaRound: QARound | null;
  practiceSession: PracticeSession | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;

  // Question structure & constraints
  activeQuestion: Question | null;
  primaryQuestions: Question[];
  followUpQuestions: Question[];
  allQuestions: Question[];
  submittedAnswers: Answer[];
  currentQuestionNumber: number;
  totalVisibleQuestions: number;

  // State indicators
  isAnalyzing: boolean;
  isSubmitting: boolean;
  isSkipping: boolean;
  isRoundCompleted: boolean;
  submitProgress: SubmitAnswerProgress | null;
  analysisProgress: AnalysisProgressedEvent | null;
  actionError: string | null;

  // Actions
  submitAnswer: (draft: AudioRecordingDraft) => Promise<boolean>;
  skipQuestion: (reason?: string) => Promise<boolean>;
  refetchRound: () => Promise<void>;
  clearActionError: () => void;
}

const MAX_PRIMARY_QUESTIONS = 3;
const MAX_FOLLOW_UP_QUESTIONS = 2;

export function useQASession(sessionId: string): UseQASessionReturn {
  const queryClient = useQueryClient();
  const { analysisProgress } = useSessionEvents(sessionId);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [analyzingQuestionId, setAnalyzingQuestionId] = useState<string | null>(null);
  const [submitProgress, setSubmitProgress] = useState<SubmitAnswerProgress | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // 1. Fetch canonical Practice Session. It gates the Q&A request so a normal
  // analysis wait never becomes a terminal `questions_not_ready` screen.
  const {
    data: practiceSession = null,
    isLoading: isSessionLoading,
    isError: isSessionError,
    error: sessionError,
  } = useQuery<PracticeSession>({
    queryKey: ["practice-session", sessionId],
    queryFn: () => apiClient.getPracticeSession(sessionId),
    enabled: !!sessionId,
    refetchInterval: (query) => {
      const state = query.state.data?.state;
      return state && ["completed", "failed", "cancelled"].includes(state)
        ? false
        : 3500;
    },
    refetchOnWindowFocus: true,
  });
  const qaReady =
    practiceSession?.state === "questions_ready" ||
    practiceSession?.state === "questions_in_progress" ||
    practiceSession?.state === "report_generating" ||
    practiceSession?.state === "completed";

  // 2. Fetch canonical QARound only once the backend says it exists.
  const {
    data: qaRound = null,
    isLoading: isQALoading,
    isError: isQAError,
    error: qaError,
    refetch: refetchQARound,
  } = useQuery<QARound>({
    queryKey: ["qa-round", sessionId],
    queryFn: () => apiClient.getQARound(sessionId),
    enabled: !!sessionId && qaReady,
    refetchInterval: (query) => {
      const round = query.state.data;
      return analyzingQuestionId ||
        (round?.state === "in_progress" && !round.current_question_id)
        ? 3500
        : false;
    },
    refetchOnWindowFocus: true,
  });

  // 3. Enforce 3 primary & 2 follow-up invariants
  const questionsList = qaRound?.questions;
  const { primaryQuestions, followUpQuestions, allQuestions } = useMemo(() => {
    if (!questionsList) {
      return { primaryQuestions: [], followUpQuestions: [], allQuestions: [] };
    }

    const primaries = questionsList
      .filter((q) => q.kind === "primary")
      .slice(0, MAX_PRIMARY_QUESTIONS);

    const followUps = questionsList
      .filter((q) => q.kind === "follow_up")
      .slice(0, MAX_FOLLOW_UP_QUESTIONS);

    return {
      primaryQuestions: primaries,
      followUpQuestions: followUps,
      allQuestions: [...primaries, ...followUps],
    };
  }, [questionsList]);

  // 4. Identify the active question
  const activeQuestion = useMemo<Question | null>(() => {
    if (!qaRound || qaRound.state === "completed") return null;

    if (qaRound.current_question_id) {
      const found = allQuestions.find((q) => q.id === qaRound.current_question_id);
      if (found) return found;
    }

    const explicitActive = allQuestions.find((q) => q.state === "active");
    if (explicitActive) return explicitActive;

    const firstPending = allQuestions.find((q) => q.state === "pending");
    return firstPending || null;
  }, [qaRound, allQuestions]);

  // 5. Submitted/skipped answers
  const submittedAnswers = useMemo<Answer[]>(() => {
    return qaRound?.answers || [];
  }, [qaRound?.answers]);

  // Determine current question number (1-based index)
  const currentQuestionNumber = useMemo(() => {
    if (!activeQuestion) return allQuestions.length;
    const idx = allQuestions.findIndex((q) => q.id === activeQuestion.id);
    return idx >= 0 ? idx + 1 : 1;
  }, [activeQuestion, allQuestions]);

  // Determine whether the round is complete
  const isRoundCompleted = useMemo(() => {
    if (!qaRound) return false;
    if (qaRound.state === "completed") return true;

    if (
      practiceSession?.state === "report_generating" ||
      practiceSession?.state === "completed"
    ) {
      return true;
    }

    return false;
  }, [qaRound, practiceSession]);

  const isAnalyzing = Boolean(
    !isRoundCompleted &&
      ((analyzingQuestionId &&
        (!activeQuestion || activeQuestion.id === analyzingQuestionId)) ||
        (qaRound?.state === "in_progress" && !qaRound.current_question_id))
  );

  // 6. Polling fallback when analyzing answer or waiting for next question
  useEffect(() => {
    if (!analyzingQuestionId) return;

    const interval = setInterval(async () => {
      const res = await queryClient.fetchQuery({
        queryKey: ["qa-round", sessionId],
        queryFn: () => apiClient.getQARound(sessionId),
      });

      if (
        res.state === "completed" ||
        (res.current_question_id && res.current_question_id !== analyzingQuestionId)
      ) {
        setAnalyzingQuestionId(null);
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [analyzingQuestionId, sessionId, queryClient]);

  // 7. Submit answer flow
  const submitAnswer = useCallback(
    async (draft: AudioRecordingDraft): Promise<boolean> => {
      if (!activeQuestion) {
        setActionError("No active question found to submit an answer for.");
        return false;
      }

      if (isSubmitting) {
        return false;
      }

      setIsSubmitting(true);
      setActionError(null);
      setSubmitProgress({ stage: "Preparing audio submission...", percent: 10 });

      try {
        const fileExt = draft.mimeType.includes("ogg")
          ? "ogg"
          : draft.mimeType.includes("wav")
          ? "wav"
          : draft.mimeType.includes("mp4")
          ? "mp4"
          : "webm";

        const fileName = `answer-${activeQuestion.id}.${fileExt}`;
        const file = new File([draft.blob], fileName, { type: draft.mimeType });
        const audioSize = draft.sizeBytes || draft.blob.size;

        // 1. Calculate SHA-256 checksum
        setSubmitProgress({ stage: "Calculating audio checksum...", percent: 25 });
        const checksum = await computeFileChecksum(file, (pct) => {
          setSubmitProgress({
            stage: "Calculating audio checksum...",
            percent: Math.min(40, 25 + Math.round(pct * 0.15)),
          });
        });

        // 2. Create answer upload intent
        setSubmitProgress({ stage: "Requesting upload slot...", percent: 45 });
        const intentKey = generateIdempotencyKey("answer-intent");
        const intentRes = await apiClient.createAnswerUploadIntent(
          activeQuestion.id,
          {
            file_name: fileName,
            declared_media_type: draft.mimeType || "audio/webm",
            declared_size_bytes: audioSize,
          },
          intentKey
        );

        const uploadUrl = intentRes.upload_intent.upload_url;
        const answerId = intentRes.answer.id;

        // 3. Direct upload to S3
        if (uploadUrl) {
          setSubmitProgress({ stage: "Uploading answer audio...", percent: 55 });
          await uploadFileDirectly({
            uploadUrl,
            file: draft.blob,
            headers: intentRes.upload_intent.required_headers,
            onProgress: (prog) => {
              setSubmitProgress({
                stage: `Uploading answer audio (${prog.percentage}%)...`,
                percent: 55 + Math.round(prog.percentage * 0.3),
              });
            },
          });
        }

        // 4. Complete the asset so the backend verifies its checksum, media,
        // size, and duration before the Answer may reference it.
        const assetVersionId = intentRes.upload_intent.version_id;
        if (!assetVersionId) {
          throw new Error("The answer upload did not return an asset version.");
        }
        setSubmitProgress({ stage: "Verifying answer audio...", percent: 87 });
        const completeKey = generateIdempotencyKey("answer-complete");
        await apiClient.completeUpload(
          intentRes.upload_intent.asset_id,
          assetVersionId,
          {
            checksum,
            size_bytes: audioSize,
          },
          completeKey,
        );

        // 5. Submit the verified answer
        setSubmitProgress({ stage: "Submitting verified answer...", percent: 90 });
        const submitKey = generateIdempotencyKey("answer-submit");
        await apiClient.submitAnswer(
          answerId,
          {
            checksum,
            size_bytes: audioSize,
          },
          submitKey
        );

        setSubmitProgress({ stage: "Answer submitted successfully!", percent: 100 });

        // Invalidate and refresh canonical round
        await queryClient.invalidateQueries({ queryKey: ["qa-round", sessionId] });
        setAnalyzingQuestionId(activeQuestion.id);
        return true;
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : "Failed to upload and submit answer audio.";
        setActionError(msg);
        return false;
      } finally {
        setIsSubmitting(false);
        setSubmitProgress(null);
      }
    },
    [activeQuestion, isSubmitting, sessionId, queryClient]
  );

  // 8. Skip question flow
  const skipQuestion = useCallback(
    async (reason?: string): Promise<boolean> => {
      if (!activeQuestion) {
        setActionError("No active question found to skip.");
        return false;
      }

      if (isSkipping) return false;

      setIsSkipping(true);
      setActionError(null);

      try {
        const skipKey = generateIdempotencyKey("answer-skip");
        await apiClient.skipAnswer(activeQuestion.id, skipKey, reason);

        await queryClient.invalidateQueries({ queryKey: ["qa-round", sessionId] });
        setAnalyzingQuestionId(activeQuestion.id);
        return true;
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : "Failed to skip question. Please try again.";
        setActionError(msg);
        return false;
      } finally {
        setIsSkipping(false);
      }
    },
    [activeQuestion, isSkipping, sessionId, queryClient]
  );

  const refetchRound = useCallback(async () => {
    await refetchQARound();
  }, [refetchQARound]);

  const clearActionError = useCallback(() => {
    setActionError(null);
  }, []);

  return {
    qaRound,
    practiceSession,
    isLoading: isQALoading || isSessionLoading,
    isError: isSessionError || (qaReady && isQAError),
    error: ((sessionError || qaError) as Error) || null,

    activeQuestion,
    primaryQuestions,
    followUpQuestions,
    allQuestions,
    submittedAnswers,
    currentQuestionNumber,
    totalVisibleQuestions: allQuestions.length,

    isAnalyzing,
    isSubmitting,
    isSkipping,
    isRoundCompleted,
    submitProgress,
    analysisProgress,
    actionError,

    submitAnswer,
    skipQuestion,
    refetchRound,
    clearActionError,
  };
}
