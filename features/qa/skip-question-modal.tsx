"use client";

import React, { useState } from "react";
import { Icon } from "@iconify/react";
import { Wrapper, Button, Modal } from "@/components";

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Skip Question ${questionNumber}?`}
      titleId="skip-question-title"
      onSubmit={handleConfirm}
      submitText="Skip Question"
      loadingText="Skipping..."
      loading={isSkipping}
      cancelText="Cancel"
    >
      <div className="flex w-full max-w-md flex-col gap-4 py-2">
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200/90 text-sm sm:text-base leading-relaxed">
          <p>
            Skipping this question will advance the Q&A round immediately. A skipped
            answer contributes <strong>zero points</strong> for this question in your final
            pitch evaluation.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="skip-reason"
            className="text-lg sm:text-xl font-medium text-white/80 text-left"
          >
            Reason for skipping (optional):
          </label>
          <textarea
            id="skip-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isSkipping}
            placeholder="e.g., Not covered in current pitch scope, or deferred to technical demo..."
            className="w-full h-24 p-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder:text-white/30 text-sm sm:text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent resize-none"
          />
        </div>
      </div>
    </Modal>
  );
}
