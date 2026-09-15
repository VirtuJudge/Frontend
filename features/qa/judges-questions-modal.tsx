"use client";

import React from "react";
import { Icon } from "@iconify/react";
import { Wrapper, Button } from "@/components";
import { Question } from "@/lib/api/types";
import { QAStepper } from "./qa-stepper";

export interface JudgesQuestionsModalProps {
  isOpen: boolean;
  questions: Question[];
  activeQuestion: Question | null;
  currentQuestionNumber: number;
  onClose: () => void;
  onOpenSkipModal: () => void;
}

function formatRubricDimension(dimension: string): string {
  if (!dimension) return "Pitch Quality";
  return dimension
    .split(/[_-]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function JudgesQuestionsModal({
  isOpen,
  questions,
  activeQuestion,
  currentQuestionNumber,
  onClose,
  onOpenSkipModal,
}: JudgesQuestionsModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="judges-questions-title"
    >
      <Wrapper
        variant="glass-dark"
        borderGradient="default"
        className="w-full max-w-2xl p-6 sm:p-8 rounded-3xl flex flex-col gap-6 relative shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#00e5cc]/15 border border-[#00e5cc]/30 flex items-center justify-center text-[#00e5cc]">
              <Icon icon="tabler:messages" className="text-xl" />
            </div>
            <div>
              <h2 id="judges-questions-title" className="text-xl font-bold text-white">
                Judges Questions
              </h2>
              <p className="text-xs text-white/50">
                Practice Session Evaluation Timeline
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors cursor-pointer"
            aria-label="Close judges questions modal"
          >
            <Icon icon="tabler:x" className="text-lg" />
          </button>
        </div>

        {/* Stepper Progress */}
        <div className="py-1">
          <QAStepper
            questions={questions}
            activeQuestionId={activeQuestion?.id}
          />
        </div>

        {/* Active Question Details */}
        {activeQuestion && (
          <div className="flex flex-col gap-4 p-5 rounded-2xl bg-white/[0.03] border border-[#00e5cc]/20">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-mono font-semibold text-[#00e5cc] uppercase tracking-wider">
                Active Question {currentQuestionNumber} of {Math.min(3, questions.length)}
              </span>

              {activeQuestion.rubric_dimension && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-white/80 border border-white/10 font-medium">
                  {formatRubricDimension(activeQuestion.rubric_dimension)}
                </span>
              )}
            </div>

            <p className="text-base sm:text-lg font-mono text-white font-medium leading-relaxed">
              &ldquo;{activeQuestion.text}&rdquo;
            </p>

            {activeQuestion.reason && (
              <div className="text-xs text-white/60 flex items-start gap-2 pt-1 border-t border-white/5">
                <Icon icon="tabler:info-circle" className="text-sm text-[#00e5cc] shrink-0 mt-0.5" />
                <span>
                  <strong>Rationale:</strong> {activeQuestion.reason}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Question History List */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-white/40">
            All Round Questions
          </span>
          <div className="flex flex-col gap-2">
            {questions.map((q, idx) => {
              const isCurrent = q.id === activeQuestion?.id;
              const isAnswered = q.state === "answered";
              const isSkipped = q.state === "skipped";

              return (
                <div
                  key={q.id}
                  className={`p-3.5 rounded-xl border transition-all text-xs sm:text-sm flex items-start gap-3 ${
                    isCurrent
                      ? "bg-[#00e5cc]/10 border-[#00e5cc]/40 text-white"
                      : "bg-white/[0.02] border-white/5 text-white/70"
                  }`}
                >
                  <span className="font-mono text-white/40 font-bold shrink-0 mt-0.5">
                    Q{idx + 1}
                  </span>
                  <div className="flex-1 flex flex-col gap-1">
                    <span className="font-mono line-clamp-2">{q.text}</span>
                  </div>
                  <span className="shrink-0 text-xs px-2 py-0.5 rounded-full font-medium">
                    {isAnswered ? (
                      <span className="text-emerald-400">Answered</span>
                    ) : isSkipped ? (
                      <span className="text-amber-400">Skipped</span>
                    ) : isCurrent ? (
                      <span className="text-[#00e5cc]">Active</span>
                    ) : (
                      <span className="text-white/40">Upcoming</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/10">
          <Button
            type="button"
            onClick={() => {
              onClose();
              onOpenSkipModal();
            }}
            className="px-5 py-2 rounded-full text-xs sm:text-sm text-amber-300 hover:text-amber-200"
          >
            <Icon icon="tabler:player-skip-forward" className="text-base" />
            <span>Skip Active Question</span>
          </Button>

          <Button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-full text-xs sm:text-sm"
          >
            Close
          </Button>
        </div>
      </Wrapper>
    </div>
  );
}
