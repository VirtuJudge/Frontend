"use client";

import React from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { PracticeSession } from "@/lib/api/types";

export interface QAHeaderProps {
  session: PracticeSession | null;
  sessionId?: string;
  isAnalyzing?: boolean;
  isRoundCompleted?: boolean;
  className?: string;
}

export function QAHeader({
  session,
  isAnalyzing = false,
  isRoundCompleted = false,
  className = "",
}: QAHeaderProps) {
  const projectId = session?.project_id;

  return (
    <header className={`w-full flex flex-col gap-3 ${className}`}>
      {/* Top Breadcrumb & Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2 text-white/60">
          {projectId ? (
            <Link
              href={`/projects/${projectId}`}
              className="hover:text-white transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00e5cc] rounded-md px-1"
            >
              <Icon icon="tabler:arrow-left" className="text-base" />
              <span>Project Overview</span>
            </Link>
          ) : (
            <Link
              href="/me"
              className="hover:text-white transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00e5cc] rounded-md px-1"
            >
              <Icon icon="tabler:arrow-left" className="text-base" />
              <span>My Account</span>
            </Link>
          )}

          <span className="text-white/30">/</span>
          <span className="text-white/80 font-medium truncate max-w-[200px] sm:max-w-xs">
            {session?.name || "Practice Session"}
          </span>
        </div>

        {/* Live Status Pill */}
        <div className="flex items-center gap-2">
          {isAnalyzing ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
              <span>Analyzing Answer...</span>
            </div>
          ) : isRoundCompleted ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Icon icon="tabler:circle-check-filled" className="text-sm" />
              <span>Q&A Complete</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#00e5cc]/15 text-[#00e5cc] border border-[#00e5cc]/30">
              <span className="w-2 h-2 rounded-full bg-[#00e5cc] animate-pulse" />
              <span>Q&A In Progress</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Title */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Pitch Q&A Round
        </h1>
        <p className="text-xs sm:text-sm text-white/60">
          Listen to targeted evaluation questions and record your spoken answers to demonstrate pitch mastery.
        </p>
      </div>
    </header>
  );
}
