"use client";

import React, { useState, useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import { Wrapper } from "@/components";
import { SessionHeader } from "@/features/session/session-header";
import { SessionControlPill } from "@/features/session/session-control-pill";
import { SessionTimerBadge } from "@/features/session/session-timer-badge";
import { Question } from "@/lib/api/types";
import {
  useAudioRecorder,
  AudioRecordingDraft,
} from "./hooks/use-audio-recorder";
import { SubmitAnswerProgress } from "./hooks/use-qa-session";
import { JudgesQuestionsModal } from "./judges-questions-modal";
import { ReviewDraftModal } from "./review-draft-modal";
import { SkipQuestionModal } from "./skip-question-modal";

export interface QAStageViewProps {
  sessionId?: string;
  questions: Question[];
  activeQuestion: Question | null;
  currentQuestionNumber: number;
  isSubmitting?: boolean;
  submitProgress?: SubmitAnswerProgress | null;
  actionError?: string | null;
  onClearActionError?: () => void;
  onSubmitDraft: (draft: AudioRecordingDraft) => Promise<boolean | void>;
  onSkipQuestion: (reason?: string) => Promise<boolean | void>;
  onNavigateBack?: () => void;
}

function formatTimer(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function QAStageView({
  sessionId,
  questions,
  activeQuestion,
  currentQuestionNumber,
  isSubmitting = false,
  submitProgress = null,
  actionError = null,
  onClearActionError,
  onSubmitDraft,
  onSkipQuestion,
  onNavigateBack,
}: QAStageViewProps) {
  const [isJudgesQuestionsOpen, setIsJudgesQuestionsOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isSkipModalOpen, setIsSkipModalOpen] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");

  const {
    isRecording,
    isPaused,
    draft,
    durationMs,
    remainingMs,
    isNearingLimit,
    error: recorderError,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    discardDraft,
    clearError,
  } = useAudioRecorder({
    maxDurationMs: 120_000, // 2 minutes recommended limit
    warningThresholdMs: 100_000,
    onRecordingComplete: () => {
      setIsReviewModalOpen(true);
    },
  });

  // Real-time speech transcription via Web Speech API when available
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // @ts-expect-error browser SpeechRecognition compatibility
    const SpeechClass = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (isRecording && !isPaused && SpeechClass) {
      try {
        const recognition = new SpeechClass();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
          let text = "";
          for (let i = 0; i < event.results.length; i++) {
            text += event.results[i][0].transcript;
          }
          if (text) {
            setLiveTranscript(text);
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
      } catch {
        // SpeechRecognition start error ignored
      }
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, [isRecording, isPaused]);

  // Handle start answering / record
  const handleStartAnswering = () => {
    setLiveTranscript("");
    onClearActionError?.();
    startRecording();
  };

  // Toggle pause/resume
  const handleTogglePause = () => {
    if (isPaused) {
      resumeRecording();
    } else {
      pauseRecording();
    }
  };

  // Stop recording and show review modal
  const handleStopRecording = () => {
    stopRecording();
  };

  // Restart / Re-record
  const handleRestart = () => {
    discardDraft();
    setLiveTranscript("");
    onClearActionError?.();
    startRecording();
  };

  // Submit from review modal
  const handleConfirmSubmit = async () => {
    if (!draft) return;
    const ok = await onSubmitDraft(draft);
    if (ok) {
      setIsReviewModalOpen(false);
      discardDraft();
      setLiveTranscript("");
    }
  };

  // Confirm skip
  const handleConfirmSkip = async (reason?: string) => {
    const ok = await onSkipQuestion(reason);
    if (ok) {
      setIsSkipModalOpen(false);
      discardDraft();
    }
  };

  // Screen 1: "A judge is asking..." (when not recording and no draft)
  // Screen 2: "Judges are listening" (when recording or paused)
  const isListeningState = isRecording || isPaused;

  const defaultQuestionText =
    activeQuestion?.text ||
    "What was your main focus on your business model in your product?";

  // Formatted countdown or elapsed timer
  const formattedTimer = isListeningState
    ? formatTimer(durationMs)
    : "02:00";

  return (
    <div className="fixed inset-0 w-full h-full bg-[#000f0e] overflow-hidden select-none flex flex-col items-center justify-between py-8 px-6 sm:px-12 z-50">
      {/* Top Ambient Glow matching screenshots */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] sm:w-[800px] h-[220px] bg-[#00e5cc]/12 rounded-full blur-[110px] pointer-events-none z-0"
        aria-hidden="true"
      />

      {/* Top Center VirtuJudge Logo Header */}
      <SessionHeader onNavigate={onNavigateBack} />

      {/* Action / Recorder Error Toast */}
      {(actionError || recorderError) && (
        <div
          className="fixed top-20 inset-x-4 max-w-lg mx-auto p-3.5 rounded-2xl bg-danger/20 border border-danger/40 text-white text-sm z-50 backdrop-blur-md shadow-2xl flex items-center justify-between gap-3"
          role="alert"
        >
          <div className="flex items-center gap-2">
            <Icon icon="tabler:alert-circle" className="text-danger text-xl shrink-0" />
            <p className="text-xs sm:text-sm text-white/90">
              {actionError || recorderError?.message}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onClearActionError?.();
              clearError();
            }}
            className="text-white/60 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
            aria-label="Dismiss error"
          >
            <Icon icon="tabler:x" className="text-base" />
          </button>
        </div>
      )}

      {/* CENTER STAGE CONTENT */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-4xl z-10 gap-6 my-auto">
        {/* Sub-header text & Icon */}
        {!isListeningState ? (
          /* Screen 1: A judge is asking... */
          <div className="flex items-center gap-2.5 text-white/90 font-mono text-sm sm:text-base tracking-wide select-none">
            <div className="relative flex items-center justify-center">
              <Icon
                icon="tabler:speakerphone"
                className="text-2xl text-white -rotate-12"
              />
              <span className="text-[10px] font-bold text-[#00e5cc] absolute -top-1 -right-2">
                ?
              </span>
            </div>
            <span>A judge is asking...</span>
          </div>
        ) : (
          /* Screen 2: Judges are listening */
          <div className="flex items-center gap-2.5 text-white/90 font-mono text-sm sm:text-base tracking-wide select-none">
            <Icon
              icon="tabler:microphone"
              className="text-xl text-[#00e5cc] animate-pulse"
            />
            <span>Judges are listening</span>
          </div>
        )}

        {/* Stadium-rounded Glass Pill Container */}
        <div
          onClick={!isListeningState ? handleStartAnswering : undefined}
          className={`w-full max-w-3xl min-h-[160px] sm:min-h-[180px] px-8 sm:px-16 py-10 rounded-[60px] sm:rounded-full bg-[#0a1b18]/75 border border-[#00e5cc]/30 backdrop-blur-2xl flex items-center justify-center text-center shadow-[0_0_60px_rgba(0,0,0,0.6)] transition-all ${
            !isListeningState
              ? "cursor-pointer hover:border-[#00e5cc]/50 hover:bg-[#0a1b18]/90 group"
              : "border-[#00e5cc]/40"
          }`}
          role="region"
          aria-label={isListeningState ? "Spoken Answer Capture" : "Active Judge Question"}
        >
          {!isListeningState ? (
            /* Screen 1 Question text */
            <div className="flex flex-col items-center gap-2 max-w-2xl">
              <p className="font-mono text-sm sm:text-base md:text-lg text-white/90 leading-relaxed group-hover:text-white transition-colors">
                {defaultQuestionText}
              </p>
              <span className="text-[11px] font-mono text-[#00e5cc]/60 opacity-0 group-hover:opacity-100 transition-opacity">
                (Click or press Space to start speaking)
              </span>
            </div>
          ) : (
            /* Screen 2 Live Spoken Transcript text */
            <div className="flex flex-col items-center gap-2 max-w-2xl">
              <p className="font-mono text-sm sm:text-base md:text-lg text-white/90 leading-relaxed">
                {liveTranscript || (
                  <span className="text-white/40 italic">
                    Listening to your voice... start speaking your answer
                  </span>
                )}
                <span className="inline-block w-2 h-4 sm:h-5 bg-[#00e5cc] ml-1.5 animate-pulse align-middle" />
              </p>
              {isNearingLimit && (
                <span className="text-xs font-mono text-amber-400 font-semibold animate-pulse">
                  Approaching 2-minute limit ({formatTimer(remainingMs)} remaining)
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM BAR CONTROLS (Identical to Screenshots) */}
      <div className="fixed bottom-8 inset-x-0 px-6 sm:px-12 flex items-center justify-between z-40">
        {/* Bottom Left: Rotate Button + Judges Questions Pill */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <Wrapper
            as="button"
            variant="glass-dark"
            borderGradient="default"
            onClick={handleRestart}
            className="w-12 h-12 p-0 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-xl cursor-pointer hover:brightness-125"
            aria-label="Restart / Re-record answer"
          >
            <Icon icon="tabler:rotate" className="text-xl text-white" />
          </Wrapper>

          <Wrapper
            as="button"
            variant="glass-dark"
            borderGradient="default"
            onClick={() => setIsJudgesQuestionsOpen(true)}
            className="h-12 px-5 py-0 rounded-full flex items-center gap-2.5 font-medium text-white shadow-xl cursor-pointer hover:brightness-125 transition-all text-sm sm:text-base"
            aria-label="Open Judges Questions timeline"
          >
            <Icon icon="tabler:message-circle" className="text-xl" />
            <span>Judges Questions</span>
          </Wrapper>
        </div>

        {/* Bottom Center: Control Pill */}
        <div className="flex items-center justify-center pointer-events-auto">
          {!isListeningState ? (
            <Wrapper
              as="button"
              variant="glass-dark"
              borderGradient="default"
              onClick={handleStartAnswering}
              className="h-12 px-6 py-0 rounded-full flex items-center gap-2.5 text-white shadow-xl cursor-pointer hover:brightness-125 transition-all active:scale-95"
              aria-label="Start recording answer"
            >
              <Icon icon="tabler:microphone" className="text-xl text-[#00e5cc]" />
              <span className="text-sm font-semibold">Answer</span>
            </Wrapper>
          ) : (
            <SessionControlPill
              allowPauses={true}
              isPaused={isPaused}
              onTogglePause={handleTogglePause}
              onEnd={handleStopRecording}
            />
          )}
        </div>

        {/* Bottom Right: Timer Badge */}
        <div className="pointer-events-auto">
          <SessionTimerBadge
            showTimer={true}
            formattedTime={formattedTimer}
          />
        </div>
      </div>

      {/* MODALS */}
      {/* 1. Judges Questions Drawer / Timeline */}
      <JudgesQuestionsModal
        isOpen={isJudgesQuestionsOpen}
        questions={questions}
        activeQuestion={activeQuestion}
        currentQuestionNumber={currentQuestionNumber}
        onClose={() => setIsJudgesQuestionsOpen(false)}
        onOpenSkipModal={() => setIsSkipModalOpen(true)}
      />

      {/* 2. Review Draft Modal (when recording stops) */}
      <ReviewDraftModal
        isOpen={isReviewModalOpen && !!draft}
        draft={draft}
        isSubmitting={isSubmitting}
        submitProgress={submitProgress}
        onRecordAgain={() => {
          setIsReviewModalOpen(false);
          handleRestart();
        }}
        onSubmit={handleConfirmSubmit}
        onClose={() => setIsReviewModalOpen(false)}
      />

      {/* 3. Skip Confirmation Modal */}
      <SkipQuestionModal
        isOpen={isSkipModalOpen}
        questionNumber={currentQuestionNumber}
        onClose={() => setIsSkipModalOpen(false)}
        onConfirm={handleConfirmSkip}
      />
    </div>
  );
}
