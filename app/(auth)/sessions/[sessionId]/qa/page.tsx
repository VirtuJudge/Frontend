"use client";

import { useQASession } from "@/hooks";
import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { Button, ImmersivePageShell } from "@/components";
import {
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
      <ImmersivePageShell header={<SessionHeader onNavigate={handleNavigateBack} />}>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <div className="flex flex-col gap-1">
            <h2 className="text-lg  font-semibold text-white">
              Loading Practice Q&A
            </h2>
            <p className="text-xs  text-white/50">
              Fetching grounded questions and session state...
            </p>
          </div>
        </div>
      </ImmersivePageShell>
    );
  }

  // 2. Error State
  if (isError && !qaRound) {
    return (
      <ImmersivePageShell
        header={<SessionHeader onNavigate={handleNavigateBack} />}
        contentClassName="w-full max-w-md"
      >
        <div className="flex flex-col items-center gap-5 rounded-3xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-xl">
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
      </ImmersivePageShell>
    );
  }

  // 3. Completed State
  if (isRoundCompleted) {
    return (
      <ImmersivePageShell
        header={<SessionHeader onNavigate={handleNavigateBack} />}
        contentClassName="w-full max-w-2xl"
      >
        <QACompletedCard
          sessionId={sessionId}
          projectId={practiceSession?.project_id}
          questions={allQuestions}
          answers={submittedAnswers}
        />
      </ImmersivePageShell>
    );
  }

  // 4. Analyzing Answer State
  if (isAnalyzing) {
    return (
      <ImmersivePageShell
        header={<SessionHeader onNavigate={handleNavigateBack} />}
        contentClassName="w-full max-w-xl"
      >
        <QAAnalyzingCard progress={analysisProgress} />
      </ImmersivePageShell>
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
