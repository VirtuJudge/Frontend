"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { Button } from "@/components";
import {
  useQASession,
  QAStageView,
  QAAnalyzingCard,
  QACompletedCard,
} from "@/features/qa";
import { SessionHeader } from "@/features/session/session-header";

export default function SessionQAPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const router = useRouter();

  const {
    qaRound,
    practiceSession,
    isLoading,
    isError,
    error,
    activeQuestion,
    allQuestions,
    submittedAnswers,
    currentQuestionNumber,
    isAnalyzing,
    isSubmitting,
    isRoundCompleted,
    submitProgress,
    analysisProgress,
    actionError,
    submitAnswer,
    skipQuestion,
    refetchRound,
    clearActionError,
  } = useQASession(sessionId);

  // Warn before unload if submitting
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSubmitting) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isSubmitting]);

  useEffect(() => {
    const state = practiceSession?.state;
    if (
      state &&
      ![
        "questions_ready",
        "questions_in_progress",
        "report_generating",
        "completed",
      ].includes(state)
    ) {
      router.replace(`/sessions/${sessionId}`);
    }
  }, [practiceSession?.state, router, sessionId]);

  const handleNavigateBack = () => {
    if (practiceSession?.project_id) {
      router.push(`/projects/${practiceSession.project_id}`);
    } else {
      router.push("/me");
    }
  };

  // 1. Initial Loading State
  if (isLoading && !qaRound) {
    return (
      <div className="fixed inset-0 w-full h-full bg-[#000f0e] flex items-center justify-center text-white p-4">
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[220px] bg-[#00e5cc]/12 rounded-full blur-[110px] pointer-events-none" />
        <SessionHeader onNavigate={handleNavigateBack} />

        <div className="flex flex-col items-center gap-4 text-center z-10">
          <div className="w-12 h-12 rounded-full border-2 border-[#00e5cc] border-t-transparent animate-spin" />
          <div className="flex flex-col gap-1">
            <h2 className="text-lg  font-semibold text-white">
              Loading Practice Q&A
            </h2>
            <p className="text-xs  text-white/50">
              Fetching grounded questions and session state...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Error State
  if (isError && !qaRound) {
    return (
      <div className="fixed inset-0 w-full h-full bg-[#000f0e] flex items-center justify-center text-white p-4">
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[220px] bg-[#00e5cc]/12 rounded-full blur-[110px] pointer-events-none" />
        <SessionHeader onNavigate={handleNavigateBack} />

        <div className="max-w-md w-full p-8 rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center text-center gap-5 z-10 backdrop-blur-xl">
          <div className="w-14 h-14 rounded-full bg-danger/20 border border-danger/30 flex items-center justify-center text-danger">
            <Icon icon="tabler:alert-triangle" className="text-2xl" />
          </div>

          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold text-white">Unable to Load Q&A</h2>
            <p className="text-sm text-white/60">
              {error?.message ||
                "Could not retrieve the Q&A round for this practice session."}
            </p>
          </div>

          <div className="flex items-center gap-3 w-full">
            <Button
              onClick={() => refetchRound()}
              className="flex-1 h-11 rounded-full text-sm"
            >
              <Icon icon="tabler:refresh" />
              <span>Try Again</span>
            </Button>
            <Button href="/me" className="flex-1 h-11 rounded-full text-sm">
              <span>My Account</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Completed State
  if (isRoundCompleted) {
    return (
      <div className="fixed inset-0 w-full h-full bg-[#000f0e] flex items-center justify-center text-white p-4">
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[220px] bg-[#00e5cc]/12 rounded-full blur-[110px] pointer-events-none" />
        <SessionHeader onNavigate={handleNavigateBack} />

        <div className="w-full max-w-2xl z-10">
          <QACompletedCard
            sessionId={sessionId}
            projectId={practiceSession?.project_id}
            questions={allQuestions}
            answers={submittedAnswers}
          />
        </div>
      </div>
    );
  }

  // 4. Analyzing Answer State
  if (isAnalyzing) {
    return (
      <div className="fixed inset-0 w-full h-full bg-[#000f0e] flex items-center justify-center text-white p-4">
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[220px] bg-[#00e5cc]/12 rounded-full blur-[110px] pointer-events-none" />
        <SessionHeader onNavigate={handleNavigateBack} />

        <div className="w-full max-w-xl z-10">
          <QAAnalyzingCard progress={analysisProgress} />
        </div>
      </div>
    );
  }

  // 5. Immersive 2-Screen Stage View ("A judge is asking..." & "Judges are listening")
  return (
    <QAStageView
      questions={allQuestions}
      activeQuestion={activeQuestion}
      currentQuestionNumber={currentQuestionNumber}
      isSubmitting={isSubmitting}
      submitProgress={submitProgress}
      actionError={actionError}
      onClearActionError={clearActionError}
      onSubmitDraft={submitAnswer}
      onSkipQuestion={skipQuestion}
      onNavigateBack={handleNavigateBack}
    />
  );
}
