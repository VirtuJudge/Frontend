"use client";

import { useRef } from "react";
import { Icon } from "@iconify/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Wrapper, Button, Text } from "@/components";
import type { Finding, PracticeSession, Report } from "@/lib/api/types";
import { WorkspaceNavBar } from "@/components/Nav-Bar";
import { useReactToPrint } from "react-to-print";

export interface SessionReportViewProps {
  report: Report;
  session?: PracticeSession | null;
  projectId?: string;
  teamId?: string;
}

export function SessionReportView({
  report,
  session,
  projectId,
  teamId,
}: SessionReportViewProps) {
  const reportRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: reportRef,
    documentTitle: `virtujudge-report-${report.practice_session_id}`,
  });

  const displayScore = Math.round(report.overall_score * 100);

  return (
    <div className="flex flex-col items-center justify-center max-w-5xl mx-auto w-full gap-10 pt-60 sm:pt-45 md:pt-45 lg:pt-45 xl:pt-30 mb-20">
      <WorkspaceNavBar selectedProjectId={projectId} selectedTeamId={teamId} />

      <div className="flex flex-row flex-wrap items-center gap-3">
        <Text size="lg">
          <span>
            {report.title || session?.name || "Practice Session Report"}
          </span>
          {", "}
          <span className="text-primary">Score: {displayScore}/100</span>
        </Text>
      </div>

      <Wrapper
        variant="glass-dark"
        borderGradient="default"
        className="flex flex-col items-center justify-between gap-6 w-full rounded-3xl p-6 sm:p-8"
      >
        <div className="flex flex-1 flex-col gap-3 text-left">
          <Text size="md" className="font-bold">
            Executive Summary
          </Text>
          <Text
            size="sm"
            className="leading-relaxed text-fg/80 w-full text-justify"
          >
            {report.executive_summary || report.team_feedback.summary}
          </Text>
        </div>
      </Wrapper>

      <FindingList
        title="Team Strengths"
        findings={report.team_feedback.strengths}
        icon="tabler:circle-check"
      />
      <FindingList
        title="Areas to Improve"
        findings={report.team_feedback.improvements}
        icon="tabler:trending-up"
      />

      <section className="flex flex-col gap-5 text-left">
        <Text as="h2" size="md" className="flex items-center gap-2 font-bold">
          <Icon icon="tabler:user" className="text-primary" />
          Individual Presenter Feedback
        </Text>
        {report.member_feedback.length > 0 ? (
          <div className="grid grid-cols-1 justify-center items-center gap-5 md:grid-cols-2 w-full">
            {report.member_feedback.map((member) => (
              <Wrapper
                key={member.user_id}
                variant="glass"
                className="flex flex-col gap-4 rounded-3xl p-6 w-full"
              >
                <div>
                  <Text as="h3" size="md" className="font-bold">
                    {member.display_name}
                  </Text>
                  <Text size="xs" className="text-fg/55">
                    {member.speaker_labels.join(", ") || "Unassigned speaker"}
                  </Text>
                </div>
                <Text size="sm" className="text-fg/80 text-justify">
                  {member.summary}
                </Text>
                <FindingList
                  title="Strengths"
                  findings={member.strengths}
                  icon="tabler:circle-check"
                />
                <FindingList
                  title="Improvements"
                  findings={member.improvements}
                  icon="tabler:trending-up"
                />
              </Wrapper>
            ))}
          </div>
        ) : (
          <Wrapper
            variant="glass"
            className="rounded-3xl p-6 text-center text-fg/60"
          >
            No individual presenter feedback was generated.
          </Wrapper>
        )}
      </section>

      {report.recommendations.length > 0 && (
        <div className="flex flex-col gap-5 text-left w-full">
          <Text as="h2" size="md" className="flex items-center gap-2 font-bold">
            <Icon icon="tabler:bulb" className="text-primary" />
            Recommendations
          </Text>
          <Wrapper variant="glass" className="rounded-3xl p-6">
            <ul className="list-disc space-y-2 pl-5 text-[20px] text-fg/80 leading-relaxed w-full text-justify">
              {report.recommendations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Wrapper>
        </div>
      )}

      {report.markdown && (
        <section className="flex flex-col gap-4 w-full min-w-0">
          <div className="flex flex-wrap mx-auto w-full items-center justify-center sm:justify-between gap-4">
            <Text size="md" className="pl-4 font-bold">
              Complete Report
            </Text>
            <PrintButtoon onClick={() => handlePrint()} />
          </div>
          <Wrapper className="w-full min-w-0 flex flex-col gap-5 rounded-3xl p-6 sm:p-8">
            <div
              className="report-markdown w-full flex flex-col min-w-0 overflow-auto"
              ref={reportRef}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  table: ({ ...props }) => (
                    <div className="w-full overflow-x-auto my-4">
                      <table {...props} />
                    </div>
                  ),
                }}
              >
                {report.markdown}
              </ReactMarkdown>
            </div>
            <PrintButtoon onClick={() => handlePrint()} />
          </Wrapper>
        </section>
      )}
    </div>
  );
}

function FindingList({
  title,
  findings,
  icon,
  compact = false,
}: {
  title: string;
  findings: Finding[];
  icon: string;
  compact?: boolean;
}) {
  if (!findings.length) return null;
  return (
    <section
      className={`flex flex-col w-full gap-3 ${compact ? "" : "text-left"}`}
    >
      <Text
        as={compact ? "h4" : "h2"}
        size={compact ? "xs" : "md"}
        className="flex items-center gap-2 font-bold"
      >
        <Icon icon={icon} className="text-primary" />
        {title}
      </Text>
      <div className="grid gap-3 w-full">
        {findings.map((finding) => (
          <Wrapper
            key={finding.id}
            variant="glass"
            className="flex flex-col items-center justify-between gap-6 w-full rounded-3xl p-6 sm:p-8"
          >
            <Text size="md" className="font-bold">
              {finding.title}
            </Text>
            <Text
              size="sm"
              className="leading-relaxed text-fg/80 w-full text-justify"
            >
              {finding.detail}
            </Text>
            {finding.recommendation && (
              <Text size="sm" className="mt-2 text-primary">
                Recommendation: {finding.recommendation}
              </Text>
            )}
          </Wrapper>
        ))}
      </div>
    </section>
  );
}

function PrintButtoon({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="primary"
      onClick={onClick}
      aria-label="Print PDF report"
      className="flex items-center gap-2 w-fit self-center"
    >
      <Icon icon="tabler:printer" />
      Print Report
    </Button>
  );
}
