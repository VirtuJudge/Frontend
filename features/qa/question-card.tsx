"use client";

import React from "react";
import { Icon } from "@iconify/react";
import { Wrapper } from "@/components";
import { Question } from "@/lib/api/types";

export interface QuestionCardProps {
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  className?: string;
}

function formatRubricDimension(dimension: string): string {
  if (!dimension) return "Pitch Quality";
  return dimension
    .split(/[_-]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function QuestionCard({
  question,
  questionIndex,
  totalQuestions,
  className = "",
}: QuestionCardProps) {
  const isFollowUp = question.kind === "follow_up";

  return (
    <article
      className={`flex flex-col gap-5 ${className}`}
      aria-labelledby="active-question-text"
    >
      <Wrapper
        variant="glass-dark"
        borderGradient="default"
        className="p-6 sm:p-8 rounded-3xl flex flex-col gap-6 relative shadow-xl border border-white/10"
      >
        {/* Header badges */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Kind Badge */}
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                isFollowUp
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                  : "bg-[#00e5cc]/15 text-[#00e5cc] border border-[#00e5cc]/30"
              }`}
            >
              <Icon
                icon={isFollowUp ? "tabler:git-branch" : "tabler:help-hexagon"}
                className="text-sm"
              />
              <span>
                {isFollowUp ? "Adaptive Follow-up" : "Primary Question"}
              </span>
            </div>

            {/* Rubric Dimension Badge */}
            {question.rubric_dimension && (
              <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-white/80 border border-white/10">
                <Icon icon="tabler:target" className="text-xs text-[#00e5cc]" />
                <span>{formatRubricDimension(question.rubric_dimension)}</span>
              </div>
            )}
          </div>

          <span className="text-xs text-white/50 ">
            {isFollowUp
              ? `Follow-up ${question.position || questionIndex}`
              : `Question ${questionIndex} of ${Math.min(3, totalQuestions)}`}
          </span>
        </div>

        {/* Question Text */}
        <div className="flex flex-col gap-2">
          <h2
            id="active-question-text"
            className="text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight leading-snug"
          >
            {question.text}
          </h2>
        </div>

        {/* Reason / Why it was asked */}
        {question.reason && (
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-start gap-3 text-sm text-white/75">
            <Icon
              icon="tabler:info-circle"
              className="text-lg text-[#00e5cc] shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
                Grounded Evaluation Rationale
              </span>
              <p className="leading-relaxed">{question.reason}</p>
            </div>
          </div>
        )}

        {/* Follow-up parent context note */}
        {isFollowUp && question.parent_answer_id && (
          <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200/90 flex items-center gap-2">
            <Icon
              icon="tabler:corner-down-right"
              className="text-base shrink-0 text-purple-400"
            />
            <span>
              This question was adaptively generated based on your earlier
              response.
            </span>
          </div>
        )}
      </Wrapper>
    </article>
  );
}
