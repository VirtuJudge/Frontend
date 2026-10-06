"use client";

import { useCallback } from "react";
import { useSessionEvents } from "@/hooks/use-session-events";
import {
  QARound,
  Question,
  Answer,
  PracticeSession,
  AnalysisProgressedEvent,
} from "@/lib/api/types";
import { AudioRecordingDraft } from "./audio-types";
import { useQAQueries } from "./use-qa-queries";
import { useQAMutations, SubmitAnswerProgress } from "./use-qa-mutations";

export type { SubmitAnswerProgress };

export interface UseQASessionReturn {
  // Queries
  qaRound: QARound | null;
  practiceSession: PracticeSession | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  contractViolation?: string | null;

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

export function useQASession(sessionId: string): UseQASessionReturn {
  const { analysisProgress } = useSessionEvents(sessionId);

  const {
    practiceSession,
    isSessionLoading,
    isSessionError,
    sessionError,
    qaReady,
    qaRound,
    isQALoading,
    isQAError,
    qaError,
    refetchQARound,
    primaryQuestions,
    followUpQuestions,
    allQuestions,
    activeQuestion,
    contractViolation,
    submittedAnswers,
    currentQuestionNumber,
    isRoundCompleted,
    isAnalyzing,
    setAnalyzingQuestionId,
    queryClient,
  } = useQAQueries(sessionId);

  const {
    isSubmitting,
    isSkipping,
    submitProgress,
    actionError,
    submitAnswer,
    skipQuestion,
    clearActionError,
  } = useQAMutations(
    sessionId,
    activeQuestion,
    setAnalyzingQuestionId,
    queryClient,
    contractViolation
  );

  const refetchRound = useCallback(async () => {
    await refetchQARound();
  }, [refetchQARound]);

  return {
    qaRound,
    practiceSession,
    isLoading: isQALoading || isSessionLoading,
    isError: isSessionError || (qaReady && isQAError) || Boolean(contractViolation),
    error: (contractViolation ? new Error(contractViolation) : ((sessionError || qaError) as Error)) || null,
    contractViolation,

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
