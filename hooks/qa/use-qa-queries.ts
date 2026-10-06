import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { PracticeSession, QARound, Question } from "@/lib/api/types";
import { useEffect, useMemo, useState } from "react";

const MAX_PRIMARY_QUESTIONS = 3;
const MAX_FOLLOW_UP_QUESTIONS = 2;

export function useQAQueries(sessionId: string) {
  const queryClient = useQueryClient();
  const [analyzingQuestionId, setAnalyzingQuestionId] = useState<string | null>(null);

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

  const activeQuestion = useMemo<Question | null>(() => {
    if (!qaRound || qaRound.state === "completed") return null;

    if (qaRound.current_question_id) {
      const found = allQuestions.find((q) => q.id === qaRound.current_question_id);
      return found || null;
    }

    const explicitActive = allQuestions.find((q) => q.state === "active");
    if (explicitActive) return explicitActive;

    const firstPending = allQuestions.find((q) => q.state === "pending");
    return firstPending || null;
  }, [qaRound, allQuestions]);

  const contractViolation = useMemo<string | null>(() => {
    if (
      qaRound &&
      qaRound.state !== "completed" &&
      qaRound.current_question_id &&
      !allQuestions.some((q) => q.id === qaRound.current_question_id)
    ) {
      return `Active question '${qaRound.current_question_id}' is omitted by question truncation (contract violation).`;
    }
    return null;
  }, [qaRound, allQuestions]);

  const submittedAnswers = useMemo(() => qaRound?.answers || [], [qaRound?.answers]);

  const currentQuestionNumber = useMemo(() => {
    if (!activeQuestion) return allQuestions.length;
    const idx = allQuestions.findIndex((q) => q.id === activeQuestion.id);
    return idx >= 0 ? idx + 1 : 1;
  }, [activeQuestion, allQuestions]);

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

  return {
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
    analyzingQuestionId,
    setAnalyzingQuestionId,
    queryClient,
  };
}
