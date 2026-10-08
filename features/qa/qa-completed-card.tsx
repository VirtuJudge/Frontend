"use client";

import { Icon } from "@iconify/react";
import { Wrapper, Button, Text } from "@/components";
import { Question, Answer } from "@/lib/api/types";

export interface QACompletedCardProps {
  sessionId: string;
  questions: Question[];
  answers?: Answer[];
  className?: string;
}

export function QACompletedCard({
  sessionId,
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
      <div className="flex justify-center items-center gap-4 max-w-md">
        <Icon
          icon="tabler:circle-check"
          className="text-4xl text-emerald-400"
        />
        <Text className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Q&A Round Completed!
        </Text>
      </div>

      <div className="flex flex-col flex-wrap items-center gap-1">
        <Text className="text-xl">Total qustions: {questions.length}</Text>
        <Text className="text-xl">Answered qustions: {answeredCount}</Text>
        <Text className="text-xl">Skipped qustions: {skippedCount}</Text>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-center gap-4 w-full max-w-md pt-2">
        <Button
          href={`/sessions/${sessionId}/speaker-mapping`}
          variant="primary"
          className="flex-1 rounded-full"
        >
          <Icon icon="tabler:users" className="text-2xl" />
          <span>Map Presenters</span>
        </Button>

        <Button
          href={`/sessions/${sessionId}/report`}
          variant="glass"
          className="flex-1 rounded-full"
        >
          <Icon icon="tabler:file-analytics" className="text-2xl" />
          <span>View Report</span>
        </Button>
      </div>
    </Wrapper>
  );
}
