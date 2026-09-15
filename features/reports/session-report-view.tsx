"use client";

import React from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { Wrapper, Button, Text, PillBadge } from "@/components";
import { Report, PracticeSession } from "@/lib/api/types";

export interface SessionReportViewProps {
  report: Report;
  session?: PracticeSession | null;
  onRefresh?: () => void;
}

export function SessionReportView({
  report,
  session,
  onRefresh,
}: SessionReportViewProps) {
  const handleDownloadPdf = () => {
    if (report.pdf_download_url) {
      const link = document.createElement("a");
      link.href = report.pdf_download_url;
      link.download = `virtujudge-report-${report.session_id}.pdf`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      window.print();
    }
  };

  const formattedDate = report.created_at
    ? new Date(report.created_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Recent";

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl mx-auto pb-16 print:p-0 print:m-0">
      {/* Top Header & Actions */}
      <div className="flex items-center justify-between flex-wrap gap-4 print:hidden">
        <div className="flex items-center gap-2">
          <Link
            href="/me"
            className="flex items-center gap-1 text-sm font-mono text-fg/70 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded px-1"
          >
            <Icon icon="tabler:arrow-left" className="text-base" />
            <span>My Account</span>
          </Link>
          {session?.project_id && (
            <>
              <span className="text-fg/30">/</span>
              <Link
                href={`/projects/${session.project_id}`}
                className="text-sm font-mono text-fg/70 hover:text-primary transition-colors"
              >
                Project
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {onRefresh && (
            <Button
              variant="glass"
              size="sm"
              onClick={onRefresh}
              aria-label="Refresh report"
              className="text-xs sm:text-sm font-mono gap-1.5"
            >
              <Icon icon="tabler:refresh" className="text-base" />
              <span>Refresh</span>
            </Button>
          )}
          <Button
            onClick={handleDownloadPdf}
            aria-label="Download PDF report"
            className="bg-[#00ffd5] hover:bg-[#2bffdc] text-black font-mono font-bold text-xs sm:text-sm rounded-full px-5 py-2 h-[42px] border-none flex items-center gap-2 shadow-lg shadow-[#00ffd5]/20 cursor-pointer active:scale-95 transition-all"
          >
            <Icon icon="tabler:download" className="text-base" />
            <span>Download PDF</span>
          </Button>
        </div>
      </div>

      {/* Printable Report Header */}
      <div className="flex flex-col gap-1 text-left">
        <div className="flex items-center gap-3 flex-wrap">
          <Text as="h1" size="lg" className="font-bold font-mono text-white text-2xl sm:text-3xl">
            {session?.name || "Practice Session Report"}
          </Text>
          <PillBadge
            variant={report.status === "ready" ? "primary" : "glass"}
          >
            {report.status === "ready" ? "Evaluation Complete" : "Pending Evaluation"}
          </PillBadge>
        </div>
        <Text size="xs" className="text-fg/60 font-mono">
          Generated on {formattedDate} • Session ID: {report.session_id}
        </Text>
      </div>

      {/* Pending State Banner */}
      {report.status === "pending" && (
        <Wrapper
          variant="glass-dark"
          borderGradient="default"
          className="p-6 text-center flex flex-col items-center gap-3 rounded-3xl"
        >
          <Icon icon="tabler:loader-2" className="text-3xl text-primary animate-spin" />
          <Text size="md" className="font-bold text-fg">
            Report Generation in Progress
          </Text>
          <Text size="sm" className="text-fg/70 max-w-md">
            The AI evaluation worker is finalizing score weights, citations, and member observations.
            Please check back in a moment or click refresh.
          </Text>
        </Wrapper>
      )}

      {/* Team Overall Score & Evaluation */}
      <Wrapper
        variant="glass-dark"
        borderGradient="default"
        className="p-6 sm:p-8 rounded-3xl flex flex-col md:flex-row items-center md:items-start justify-between gap-6"
      >
        <div className="flex flex-col gap-3 text-left flex-1">
          <div className="flex items-center gap-2">
            <Icon icon="tabler:users-group" className="text-xl text-[#00ffd5]" />
            <Text size="md" className="font-bold font-mono text-white text-lg sm:text-xl">
              Team Pitch Score
            </Text>
          </div>
          <Text size="sm" className="text-fg/80 leading-relaxed font-mono">
            {report.team_feedback || "Overall pitch performance evaluated across content, clarity, structure, and Q&A delivery."}
          </Text>
        </div>

        <div className="flex flex-col items-center justify-center p-5 bg-[#031d1a] border border-[#0d3b34] rounded-2xl shrink-0 min-w-[130px] text-center">
          <span className="text-3xl sm:text-4xl font-mono font-bold text-[#00ffd5]">
            {Math.round(report.team_score)}
          </span>
          <span className="text-xs font-mono text-fg/50 mt-1 uppercase tracking-wider">
            out of 100
          </span>
        </div>
      </Wrapper>

      {/* Individual Presenter Feedback Section */}
      <div className="flex flex-col gap-5 text-left">
        <div className="flex items-center gap-2.5">
          <Icon icon="tabler:user-star" className="text-xl text-[#00ffd5]" />
          <Text size="md" className="font-bold font-mono text-white text-xl">
            Individual Presenter Feedback
          </Text>
        </div>

        {report.member_feedback && report.member_feedback.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {report.member_feedback.map((member, index) => (
              <Wrapper
                key={member.speaker_id || member.user_id || index}
                variant="glass"
                borderGradient="default"
                className="p-5 sm:p-6 rounded-3xl flex flex-col gap-4 text-left justify-between"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-[#08221f] border border-[#103a34] flex items-center justify-center text-xs font-mono font-bold text-white">
                        {member.speaker_id || `P${index + 1}`}
                      </span>
                      <span className="font-mono font-bold text-white text-base">
                        Speaker {member.speaker_id || index + 1}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#031d1a] border border-[#0d3b34]">
                      <span className="text-sm font-mono font-bold text-[#00ffd5]">
                        {Math.round(member.score)}
                      </span>
                      <span className="text-[10px] font-mono text-fg/50">/100</span>
                    </div>
                  </div>

                  {/* Strengths */}
                  {member.strengths && member.strengths.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-mono font-bold text-[#00e5a3] flex items-center gap-1">
                        <Icon icon="tabler:circle-check" className="text-sm" />
                        Strengths
                      </span>
                      <ul className="list-disc list-inside text-xs font-mono text-fg/80 space-y-1">
                        {member.strengths.map((item, i) => (
                          <li key={i} className="leading-normal">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Areas for Improvement */}
                  {member.areas_for_improvement && member.areas_for_improvement.length > 0 && (
                    <div className="flex flex-col gap-1.5 mt-1">
                      <span className="text-xs font-mono font-bold text-[#ffb84d] flex items-center gap-1">
                        <Icon icon="tabler:trending-up" className="text-sm" />
                        Areas for Improvement
                      </span>
                      <ul className="list-disc list-inside text-xs font-mono text-fg/80 space-y-1">
                        {member.areas_for_improvement.map((item, i) => (
                          <li key={i} className="leading-normal">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Transcript Evidence */}
                  {member.transcript_citations && member.transcript_citations.length > 0 && (
                    <div className="flex flex-col gap-1.5 mt-2 p-3 rounded-2xl bg-[#041d1a] border border-[#0d3b34]">
                      <span className="text-[11px] font-mono text-fg/60 flex items-center gap-1">
                        <Icon icon="tabler:quote" className="text-xs text-[#00ffd5]" />
                        Transcript Evidence
                      </span>
                      <div className="flex flex-col gap-1 text-[11px] font-mono text-fg/70 italic">
                        {member.transcript_citations.map((cite, i) => (
                          <p key={i} className="leading-relaxed">
                            &ldquo;{cite}&rdquo;
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Wrapper>
            ))}
          </div>
        ) : (
          <Wrapper
            variant="glass"
            borderGradient="default"
            className="p-6 text-center text-fg/60 rounded-3xl"
          >
            No individual presenter feedback recorded for this session.
          </Wrapper>
        )}
      </div>
    </div>
  );
}
