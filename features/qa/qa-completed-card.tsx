"use client";

import React from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { Wrapper, Button } from "@/components";
import { Question, Answer } from "@/lib/api/types";

export interface QACompletedCardProps {
  sessionId: string;
  projectId?: string;
  questions: Question[];
  answers?: Answer[];
  className?: string;
}

export function QACompletedCard({
  sessionId,
  projectId,
  questions,
  className = "",
}: QACompletedCardProps) {
  const answeredCount = questions.filter((q) => q.state === "answered").length;
  const skippedCount = questions.filter((q) => q.state === "skipped").length;

  return (
    <Wrapper
      variant="glass-dark"
      borderGradient="default"
      className={`p-8 sm:p-12 rounded-3xl flex flex-col items-center justify-center text-center gap-6 shadow-2xl border border-white/10 ${className}`}
      role="region"
      aria-label="Q&A Round Completed"
    >
      <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg">
        <Icon icon="tabler:circle-check" className="text-4xl" />
      </div>

      <div className="flex flex-col gap-2 max-w-md">
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Q&A Round Completed!
        </h2>
        <p className="text-sm text-white/60 leading-relaxed">
          You have completed all questions for this practice session. Your pitch presentation,
          spoken answers, and supporting documents are now ready for the final evaluation report.
        </p>
      </div>

      {/* Summary stats */}
      <div className="flex items-center gap-4 py-2">
        <div className="flex flex-col items-center px-4 py-2 rounded-2xl bg-white/5 border border-white/10">
          <span className="text-2xl font-bold text-white font-mono">{answeredCount}</span>
          <span className="text-xs text-white/50">Answered</span>
        </div>

        <div className="flex flex-col items-center px-4 py-2 rounded-2xl bg-white/5 border border-white/10">
          <span className="text-2xl font-bold text-amber-400 font-mono">{skippedCount}</span>
          <span className="text-xs text-white/50">Skipped</span>
        </div>

        <div className="flex flex-col items-center px-4 py-2 rounded-2xl bg-white/5 border border-white/10">
          <span className="text-2xl font-bold text-[#00e5cc] font-mono">{questions.length}</span>
          <span className="text-xs text-white/50">Total Questions</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-center gap-4 w-full max-w-sm pt-2">
        <Link
          href={`/sessions/${sessionId}/report`}
          className="flex-1 h-12 rounded-full font-bold text-black bg-[#00e5cc] hover:bg-[#00f5db] active:scale-95 transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-[#00e5cc] focus-visible:outline-none min-w-[200px]"
        >
          <Icon icon="tabler:file-analytics" className="text-xl" />
          <span>View Final Report</span>
        </Link>

        {projectId && (
          <Button href={`/projects/${projectId}`} className="h-12 px-6 rounded-full min-w-[140px]">
            <span>Project Home</span>
          </Button>
        )}
      </div>
    </Wrapper>
  );
}
