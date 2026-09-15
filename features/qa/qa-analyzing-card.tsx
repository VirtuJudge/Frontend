"use client";

import React from "react";
import { Icon } from "@iconify/react";
import { Wrapper } from "@/components";

export interface QAAnalyzingCardProps {
  className?: string;
}

export function QAAnalyzingCard({ className = "" }: QAAnalyzingCardProps) {
  return (
    <Wrapper
      variant="glass-dark"
      borderGradient="default"
      className={`p-8 sm:p-12 rounded-3xl flex flex-col items-center justify-center text-center gap-6 shadow-xl border border-white/10 ${className}`}
      role="status"
      aria-live="polite"
      aria-label="Answer Analysis in Progress"
    >
      <div className="relative flex items-center justify-center">
        {/* Glowing concentric rings */}
        <div className="w-20 h-20 rounded-full bg-purple-500/10 border border-purple-500/30 animate-ping absolute" />
        <div className="w-16 h-16 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 relative shadow-lg">
          <Icon icon="tabler:sparkles" className="text-3xl animate-pulse" />
        </div>
      </div>

      <div className="flex flex-col gap-2 max-w-md">
        <h3 className="text-xl font-bold text-white">Analyzing Your Answer</h3>
        <p className="text-sm text-white/60 leading-relaxed">
          VirtuJudge AI is transcribing your audio, cross-referencing your pitch
          claims, and preparing the next question or adaptive follow-up...
        </p>
      </div>

      <div className="flex items-center gap-2 text-xs font-mono text-purple-300/80 bg-purple-500/10 px-4 py-2 rounded-full border border-purple-500/20">
        <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
        <span>Evaluating rubric alignment & evidence</span>
      </div>
    </Wrapper>
  );
}
