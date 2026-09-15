"use client";

import React from "react";
import { Icon } from "@iconify/react";
import { Wrapper, Button } from "@/components";
import { AudioPlayer } from "./audio-player";
import { AudioRecordingDraft } from "./hooks/use-audio-recorder";
import { SubmitAnswerProgress } from "./hooks/use-qa-session";

export interface ReviewDraftModalProps {
  isOpen: boolean;
  draft: AudioRecordingDraft | null;
  isSubmitting?: boolean;
  submitProgress?: SubmitAnswerProgress | null;
  onRecordAgain: () => void;
  onSubmit: () => Promise<void> | void;
  onClose: () => void;
}

export function ReviewDraftModal({
  isOpen,
  draft,
  isSubmitting = false,
  submitProgress = null,
  onRecordAgain,
  onSubmit,
  onClose,
}: ReviewDraftModalProps) {
  if (!isOpen || !draft) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-draft-title"
    >
      <Wrapper
        variant="glass-dark"
        borderGradient="default"
        className="w-full max-w-lg p-6 sm:p-8 rounded-3xl flex flex-col gap-6 relative shadow-2xl border border-white/10"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#00e5cc]/15 border border-[#00e5cc]/30 flex items-center justify-center text-[#00e5cc]">
              <Icon icon="tabler:headphones" className="text-xl" />
            </div>
            <div>
              <h3 id="review-draft-title" className="text-xl font-bold text-white">
                Review Your Answer
              </h3>
              <p className="text-xs text-white/50">
                Listen before submitting. Your recording is stored locally.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-white/60 hover:text-white p-1 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close review modal"
          >
            <Icon icon="tabler:x" className="text-xl" />
          </button>
        </div>

        {/* Audio Player */}
        <AudioPlayer src={draft.url} durationMs={draft.durationMs} />

        {/* Upload Progress */}
        {isSubmitting && submitProgress && (
          <div className="flex flex-col gap-2 p-3.5 rounded-2xl bg-white/5 border border-white/10">
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

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <Button
            type="button"
            onClick={onRecordAgain}
            disabled={isSubmitting}
            className="flex-1 h-12 rounded-full min-w-[140px]"
            aria-label="Discard draft and record again"
          >
            <Icon icon="tabler:rotate" className="text-lg" />
            <span>Record Again</span>
          </Button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="flex-1 h-12 rounded-full font-bold text-black bg-[#00e5cc] hover:bg-[#00f5db] active:scale-95 transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none focus-visible:ring-2 focus-visible:ring-[#00e5cc] focus-visible:outline-none min-w-[170px]"
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
      </Wrapper>
    </div>
  );
}
