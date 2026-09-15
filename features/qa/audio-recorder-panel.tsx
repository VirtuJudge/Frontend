"use client";

import React from "react";
import { Icon } from "@iconify/react";
import { Wrapper, Button } from "@/components";
import {
  useAudioRecorder,
  AudioRecordingDraft,
} from "./hooks/use-audio-recorder";
import { AudioPlayer } from "./audio-player";
import { SubmitAnswerProgress } from "./hooks/use-qa-session";

export interface AudioRecorderPanelProps {
  isSubmitting?: boolean;
  submitProgress?: SubmitAnswerProgress | null;
  onSubmitDraft: (draft: AudioRecordingDraft) => Promise<void> | void;
  onOpenSkipModal: () => void;
  className?: string;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function AudioRecorderPanel({
  isSubmitting = false,
  submitProgress = null,
  onSubmitDraft,
  onOpenSkipModal,
  className = "",
}: AudioRecorderPanelProps) {
  const {
    state,
    isRecording,
    isPaused,
    hasDraft,
    draft,
    durationMs,
    remainingMs,
    isNearingLimit,
    isAtLimit,
    error,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    discardDraft,
    clearError,
  } = useAudioRecorder({
    maxDurationMs: 120_000, // 2 minutes strict limit
    warningThresholdMs: 100_000,
  });

  const handleSubmit = async () => {
    if (!draft || isSubmitting) return;
    await onSubmitDraft(draft);
  };

  return (
    <Wrapper
      variant="glass-dark"
      borderGradient="default"
      className={`p-6 sm:p-8 rounded-3xl flex flex-col gap-6 relative shadow-xl border border-white/10 ${className}`}
      role="region"
      aria-label="Answer Recording Controls"
    >
      {/* 1. Error state (Permission blocked, unsupported, etc.) */}
      {error && (
        <div
          className="p-4 rounded-2xl bg-danger/15 border border-danger/30 text-white flex items-start gap-3 text-sm"
          role="alert"
          aria-live="assertive"
        >
          <Icon
            icon="tabler:alert-circle-filled"
            className="text-xl text-danger shrink-0 mt-0.5"
          />
          <div className="flex-1 flex flex-col gap-1">
            <span className="font-semibold text-danger">Microphone Notice</span>
            <p className="text-white/80">{error.message}</p>
            <div className="flex items-center gap-3 mt-2">
              <button
                type="button"
                onClick={startRecording}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-danger/20 hover:bg-danger/30 text-danger-fg transition-colors cursor-pointer"
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={clearError}
                className="text-xs text-white/50 hover:text-white transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Ready State (Before recording, no draft) */}
      {state === "idle" && !hasDraft && (
        <div className="flex flex-col items-center justify-center text-center gap-5 py-4">
          <div className="w-16 h-16 rounded-full bg-[#00e5cc]/10 border border-[#00e5cc]/25 flex items-center justify-center text-[#00e5cc]">
            <Icon icon="tabler:microphone" className="text-3xl" />
          </div>

          <div className="flex flex-col gap-1.5 max-w-md">
            <h3 className="text-lg font-bold text-white">Record Your Spoken Answer</h3>
            <p className="text-sm text-white/60">
              Speak naturally as you would in a live pitch session. The recommended answer
              limit is <strong>2 minutes (120 seconds)</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-sm pt-2">
            <button
              type="button"
              onClick={startRecording}
              className="flex-1 h-12 rounded-full font-bold text-black bg-[#00e5cc] hover:bg-[#00f5db] active:scale-95 transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-[#00e5cc] focus-visible:outline-none min-w-[180px]"
              aria-label="Start recording answer"
            >
              <Icon icon="tabler:microphone" className="text-xl" />
              <span>Start Recording</span>
            </button>

            <Button
              type="button"
              onClick={onOpenSkipModal}
              className="h-12 px-6 rounded-full min-w-[120px]"
              aria-label="Skip this question"
            >
              <Icon icon="tabler:player-skip-forward" className="text-lg" />
              <span>Skip</span>
            </Button>
          </div>
        </div>
      )}

      {/* 3. Requesting Permission State */}
      {state === "requesting_permission" && (
        <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
          <div className="w-12 h-12 rounded-full border-2 border-[#00e5cc] border-t-transparent animate-spin" />
          <p className="text-sm text-white/80">Requesting microphone access...</p>
        </div>
      )}

      {/* 4. Active Recording / Paused State */}
      {(isRecording || isPaused) && (
        <div className="flex flex-col items-center gap-6 py-4">
          {/* Status Badge & Non-color indicator */}
          <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isRecording ? "bg-red-500 animate-pulse" : "bg-amber-400"
              }`}
              aria-hidden="true"
            />
            <span
              className="text-xs font-semibold tracking-wide uppercase text-white/90"
              aria-live="polite"
            >
              {isRecording ? "Recording in progress" : "Recording paused"}
            </span>
          </div>

          {/* Large Live Timer */}
          <div className="flex flex-col items-center gap-1">
            <div
              className={`text-4xl sm:text-5xl font-mono font-bold tracking-tight ${
                isNearingLimit ? "text-amber-400 animate-pulse" : "text-white"
              }`}
              aria-live="off"
            >
              {formatDuration(durationMs)}
              <span className="text-xl sm:text-2xl text-white/40 font-normal">
                {" "}
                / 02:00
              </span>
            </div>

            {isNearingLimit && !isAtLimit && (
              <span className="text-xs text-amber-400 font-medium">
                Approaching 2-minute limit ({formatDuration(remainingMs)} remaining)
              </span>
            )}

            {isAtLimit && (
              <span className="text-xs text-danger font-medium">
                Maximum limit of 2 minutes reached. Stopping recording.
              </span>
            )}
          </div>

          {/* Visual Waveform Equalizer (Reduced motion friendly) */}
          <div
            className="flex items-center justify-center gap-1.5 h-10 w-full max-w-xs"
            aria-hidden="true"
          >
            {[18, 36, 24, 42, 30, 20, 38, 28, 44, 22, 32].map((height, i) => (
              <span
                key={i}
                className={`w-1.5 rounded-full bg-[#00e5cc] transition-all duration-150 ${
                  isRecording ? "animate-pulse" : "opacity-40"
                }`}
                style={{
                  height: isRecording ? `${height}px` : "12px",
                  animationDelay: `${i * 80}ms`,
                }}
              />
            ))}
          </div>

          {/* Controls: Pause/Resume + Finish */}
          <div className="flex items-center gap-4 flex-wrap justify-center w-full max-w-sm">
            {isRecording ? (
              <Button
                type="button"
                onClick={pauseRecording}
                className="flex-1 h-12 rounded-full min-w-[130px]"
                aria-label="Pause recording"
              >
                <Icon icon="tabler:player-pause" className="text-lg" />
                <span>Pause</span>
              </Button>
            ) : (
              <Button
                type="button"
                onClick={resumeRecording}
                className="flex-1 h-12 rounded-full min-w-[130px]"
                aria-label="Resume recording"
              >
                <Icon icon="tabler:player-play" className="text-lg" />
                <span>Resume</span>
              </Button>
            )}

            <button
              type="button"
              onClick={stopRecording}
              className="flex-1 h-12 rounded-full font-bold text-white bg-red-600 hover:bg-red-500 active:scale-95 transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none min-w-[150px]"
              aria-label="Stop recording and review answer draft"
            >
              <Icon icon="tabler:player-stop-filled" className="text-lg" />
              <span>Finish & Review</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. Review Draft State (Recorded, local playback, re-record or submit) */}
      {hasDraft && draft && !isRecording && !isPaused && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Icon
                icon="tabler:circle-check-filled"
                className="text-emerald-400 text-lg"
              />
              <span className="text-sm font-semibold text-white">
                Draft Recorded ({formatDuration(draft.durationMs)})
              </span>
            </div>
            <span className="text-xs text-white/50">
              Not uploaded yet &bull; Local preview only
            </span>
          </div>

          {/* Audio Player Preview */}
          <AudioPlayer src={draft.url} durationMs={draft.durationMs} />

          {/* Submission progress */}
          {isSubmitting && submitProgress && (
            <div className="flex flex-col gap-2 p-3 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex justify-between text-xs text-white/80 font-medium">
                <span>{submitProgress.stage}</span>
                <span>{submitProgress.percent}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#00e5cc] h-full transition-all duration-300 rounded-full"
                  style={{ width: `${submitProgress.percent}%` }}
                />
              </div>
            </div>
          )}

          {/* Actions: Re-record (replace draft) or Submit */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <Button
              type="button"
              onClick={discardDraft}
              disabled={isSubmitting}
              className="flex-1 h-12 rounded-full min-w-[150px]"
              aria-label="Discard draft and record again"
            >
              <Icon icon="tabler:rotate" className="text-lg" />
              <span>Record Again</span>
            </Button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 h-12 rounded-full font-bold text-black bg-[#00e5cc] hover:bg-[#00f5db] active:scale-95 transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none focus-visible:ring-2 focus-visible:ring-[#00e5cc] focus-visible:outline-none min-w-[180px]"
              aria-label="Submit answer recording"
            >
              {isSubmitting ? (
                <>
                  <Icon icon="tabler:loader-2" className="text-xl animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Icon icon="tabler:upload" className="text-xl" />
                  <span>Submit Answer</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </Wrapper>
  );
}
