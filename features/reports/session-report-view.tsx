"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { Wrapper, Button, Text, PillBadge } from "@/components";
import { apiClient } from "@/lib/api/client";
import type { Finding, PracticeSession, Report } from "@/lib/api/types";
import { generateIdempotencyKey } from "@/lib/upload/idempotency";

export interface SessionReportViewProps {
  report: Report;
  session?: PracticeSession | null;
  onRefresh?: () => void;
}

const delay = (milliseconds: number) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds));

export function SessionReportView({ report, session, onRefresh }: SessionReportViewProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownloadPdf = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    setDownloadError(null);
    try {
      let reportExport = await apiClient.createReportPdf(
        report.practice_session_id,
        generateIdempotencyKey("report-pdf"),
      );
      for (let attempt = 0; attempt < 40 && ["queued", "rendering"].includes(reportExport.status); attempt += 1) {
        await delay(1500);
        reportExport = await apiClient.getReportExport(reportExport.id);
      }
      if (reportExport.status !== "ready") {
        throw new Error(reportExport.failure?.message || "The PDF export did not finish.");
      }
      const intent = await apiClient.createReportExportDownloadIntent(reportExport.id);
      const link = document.createElement("a");
      link.href = intent.download_url;
      link.download = intent.file_name || `virtujudge-report-${report.practice_session_id}.pdf`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : "Unable to download the PDF report.");
    } finally {
      setIsDownloading(false);
    }
  };

  const formattedDate = new Date(report.generated_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const displayScore = Math.round(report.overall_score * 100);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 pb-16 print:m-0 print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-2">
          <Link href="/me" className="text-sm text-fg/70 transition-colors hover:text-primary">My Account</Link>
          {session?.project_id && <Link href={`/projects/${session.project_id}`} className="text-sm text-fg/70 transition-colors hover:text-primary">/ Project</Link>}
        </div>
        <div className="flex items-center gap-3">
          {onRefresh && <Button variant="glass" size="sm" onClick={onRefresh} aria-label="Refresh report"><Icon icon="tabler:refresh" />Refresh</Button>}
          <Button onClick={handleDownloadPdf} loading={isDownloading} aria-label="Download PDF report"><Icon icon="tabler:download" />Download PDF</Button>
        </div>
      </div>

      {downloadError && <Wrapper variant="danger" className="rounded-2xl p-4 text-sm">{downloadError}</Wrapper>}

      <div className="flex flex-col gap-2 text-left">
        <div className="flex flex-wrap items-center gap-3">
          <Text as="h1" size="lg" className="text-2xl font-bold sm:text-3xl">{report.title || session?.name || "Practice Session Report"}</Text>
          <PillBadge variant="primary">Evaluation Complete</PillBadge>
        </div>
        <Text size="xs" className="text-fg/60">Generated on {formattedDate} • Session ID: {report.practice_session_id}</Text>
      </div>

      <Wrapper variant="glass-dark" borderGradient="default" className="flex flex-col items-center justify-between gap-6 rounded-3xl p-6 sm:p-8 md:flex-row">
        <div className="flex flex-1 flex-col gap-3 text-left">
          <Text as="h2" size="md" className="text-lg font-bold">Team Pitch Score</Text>
          <Text size="sm" className="leading-relaxed text-fg/80">{report.executive_summary || report.team_feedback.summary}</Text>
        </div>
        <div className="min-w-[130px] rounded-2xl border border-[#0d3b34] bg-[#031d1a] p-5 text-center">
          <span className="text-4xl font-bold text-primary">{displayScore}</span>
          <span className="mt-1 block text-xs text-fg/50">out of 100</span>
        </div>
      </Wrapper>

      <FindingList title="Team Strengths" findings={report.team_feedback.strengths} icon="tabler:circle-check" />
      <FindingList title="Areas to Improve" findings={report.team_feedback.improvements} icon="tabler:trending-up" />

      <section className="flex flex-col gap-5 text-left">
        <Text as="h2" size="md" className="text-xl font-bold">Individual Presenter Feedback</Text>
        {report.member_feedback.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {report.member_feedback.map((member) => (
              <Wrapper key={member.user_id} variant="glass" className="flex flex-col gap-4 rounded-3xl p-6">
                <div>
                  <Text as="h3" size="md" className="font-bold">{member.display_name}</Text>
                  <Text size="xs" className="text-fg/55">{member.speaker_labels.join(", ") || "Unassigned speaker"}</Text>
                </div>
                <Text size="sm" className="text-fg/80">{member.summary}</Text>
                <FindingList title="Strengths" findings={member.strengths} icon="tabler:circle-check" compact />
                <FindingList title="Improvements" findings={member.improvements} icon="tabler:trending-up" compact />
              </Wrapper>
            ))}
          </div>
        ) : <Wrapper variant="glass" className="rounded-3xl p-6 text-center text-fg/60">No individual presenter feedback was generated.</Wrapper>}
      </section>

      {report.recommendations.length > 0 && (
        <Wrapper variant="glass-dark" className="rounded-3xl p-6">
          <Text as="h2" size="md" className="mb-3 font-bold">Recommendations</Text>
          <ul className="list-disc space-y-2 pl-5 text-sm text-fg/80">{report.recommendations.map((item) => <li key={item}>{item}</li>)}</ul>
        </Wrapper>
      )}
    </div>
  );
}

function FindingList({ title, findings, icon, compact = false }: { title: string; findings: Finding[]; icon: string; compact?: boolean }) {
  if (!findings.length) return null;
  return (
    <section className={`flex flex-col gap-3 ${compact ? "" : "text-left"}`}>
      <Text as={compact ? "h4" : "h2"} size={compact ? "xs" : "md"} className="flex items-center gap-2 font-bold"><Icon icon={icon} className="text-primary" />{title}</Text>
      <div className="grid gap-3">
        {findings.map((finding) => (
          <Wrapper key={finding.id} variant="glass" className="rounded-2xl p-4">
            <Text size="sm" className="font-semibold">{finding.title}</Text>
            <Text size="xs" className="mt-1 text-fg/70">{finding.detail}</Text>
            {finding.recommendation && <Text size="xs" className="mt-2 text-primary">{finding.recommendation}</Text>}
          </Wrapper>
        ))}
      </div>
    </section>
  );
}
