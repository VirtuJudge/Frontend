"use client";

import React from "react";
import { Icon } from "@iconify/react";
import { Question } from "@/lib/api/types";

export interface QAStepperProps {
  questions: Question[];
  activeQuestionId?: string | null;
  className?: string;
}

export function QAStepper({
  questions,
  activeQuestionId,
  className = "",
}: QAStepperProps) {
  if (!questions || questions.length === 0) return null;

  return (
    <nav
      aria-label="Q&A Questions Progress"
      className={`w-full flex items-center justify-between gap-2 overflow-x-auto py-2 ${className}`}
    >
      <ol className="flex items-center w-full gap-2 sm:gap-3">
        {questions.map((question, index) => {
          const isActive = question.id === activeQuestionId;
          const isAnswered = question.state === "answered";
          const isSkipped = question.state === "skipped";

          const isFollowUp = question.kind === "follow_up";
          const label = isFollowUp
            ? `Follow-up ${question.position || index + 1}`
            : `Question ${index + 1}`;

          return (
            <li
              key={question.id}
              className="flex-1 flex flex-col items-center gap-1.5 min-w-[70px]"
              aria-current={isActive ? "step" : undefined}
            >
              <div
                className={`w-full h-1.5 rounded-full transition-all duration-300 ${
                  isActive
                    ? "bg-[#00e5cc] shadow-[0_0_8px_rgba(0,229,204,0.6)]"
                    : isAnswered
                    ? "bg-emerald-500"
                    : isSkipped
                    ? "bg-amber-500/80"
                    : "bg-white/10"
                }`}
              />

              <div className="flex items-center gap-1 text-xs">
                {isAnswered && (
                  <Icon
                    icon="tabler:circle-check-filled"
                    className="text-emerald-400 text-sm"
                    aria-hidden="true"
                  />
                )}
                {isSkipped && (
                  <Icon
                    icon="tabler:circle-minus"
                    className="text-amber-400 text-sm"
                    aria-hidden="true"
                  />
                )}
                {isActive && (
                  <span
                    className="w-2 h-2 rounded-full bg-[#00e5cc] animate-pulse"
                    aria-hidden="true"
                  />
                )}

                <span
                  className={`font-medium truncate ${
                    isActive
                      ? "text-[#00e5cc] font-semibold"
                      : isAnswered
                      ? "text-emerald-400/90"
                      : isSkipped
                      ? "text-amber-400/90"
                      : "text-white/40"
                  }`}
                >
                  {label}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
