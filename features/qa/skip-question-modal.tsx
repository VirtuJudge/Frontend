"use client";

import React, { useState } from "react";
import { Icon } from "@iconify/react";
import { Wrapper, Button } from "@/components";

export interface SkipQuestionModalProps {
  isOpen: boolean;
  questionNumber: number;
  isSkipping?: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => Promise<void> | void;
}

export function SkipQuestionModal({
  isOpen,
  questionNumber,
  isSkipping = false,
  onClose,
  onConfirm,
}: SkipQuestionModalProps) {
  const [reason, setReason] = useState("");

  if (!isOpen) return null;

  const handleConfirm = async () => {
    await onConfirm(reason.trim() || undefined);
    setReason("");
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="skip-question-title"
    >
      <Wrapper
        variant="glass-dark"
        borderGradient="default"
        className="w-full max-w-lg p-6 rounded-3xl flex flex-col gap-6 relative shadow-2xl border border-white/10"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Icon icon="tabler:alert-triangle" className="text-xl" />
            </div>
            <div>
              <h3 id="skip-question-title" className="text-xl font-semibold text-white">
                Skip Question {questionNumber}?
              </h3>
              <p className="text-sm text-white/60">This action cannot be undone.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSkipping}
            className="text-white/60 hover:text-white p-1 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close modal"
          >
            <Icon icon="tabler:x" className="text-xl" />
          </button>
        </div>

        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200/90 text-sm leading-relaxed">
          <p>
            Skipping this question will advance the Q&A round immediately. A skipped
            answer contributes <strong>zero points</strong> for this question in your final
            pitch evaluation.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="skip-reason"
            className="text-sm font-medium text-white/80"
          >
            Reason for skipping (optional):
          </label>
          <textarea
            id="skip-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isSkipping}
            placeholder="e.g., Not covered in current pitch scope, or deferred to technical demo..."
            className="w-full h-24 p-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder:text-white/30 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00e5cc] resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            onClick={onClose}
            disabled={isSkipping}
            className="px-5 py-2.5 rounded-full"
          >
            Cancel
          </Button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSkipping}
            className="h-11 px-6 rounded-full font-semibold text-white bg-amber-600 hover:bg-amber-500 active:scale-95 transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
          >
            {isSkipping ? (
              <>
                <Icon icon="tabler:loader-2" className="text-lg animate-spin" />
                <span>Skipping...</span>
              </>
            ) : (
              <>
                <Icon icon="tabler:player-skip-forward" className="text-lg" />
                <span>Skip Question</span>
              </>
            )}
          </button>
        </div>
      </Wrapper>
    </div>
  );
}
