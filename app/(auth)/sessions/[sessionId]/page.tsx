"use client";

import React, { use } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Icon } from "@iconify/react";
import { Button, Text, Wrapper } from "@/components";
import { apiClient } from "@/lib/api/client";
import { SessionReportView } from "@/features/reports";

interface SessionPageProps {
  params: Promise<{ sessionId: string }>;
}

export default function SessionPage({ params }: SessionPageProps) {
  const { sessionId } = use(params);
  const queryClient = useQueryClient();

  const {
    data: report,
    isLoading: isReportLoading,
    error: reportError,
    refetch: refetchReport,
  } = useQuery({
    queryKey: ["report", sessionId],
    queryFn: () => apiClient.getReport(sessionId),
  });

  const { data: session } = useQuery({
    queryKey: ["practiceSession", sessionId],
    queryFn: () => apiClient.getPracticeSession(sessionId),
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["report", sessionId] });
    refetchReport();
  };

  // 1. Loading State
  if (isReportLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <Icon icon="tabler:loader-2" className="text-4xl text-[#00ffd5] animate-spin" />
        <Text size="md" className="font-mono text-white">
          Loading session report...
        </Text>
      </div>
    );
  }

  // 2. Error State (e.g. 404 or 409 report_not_ready)
  if (reportError || !report) {
    const isPending =
      reportError &&
      "status" in reportError &&
      (reportError as { status: number }).status === 409;

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center max-w-lg mx-auto px-4">
        <Wrapper
          variant="glass-dark"
          borderGradient="default"
          className="p-8 rounded-3xl flex flex-col items-center gap-4 text-center w-full"
        >
          <Icon
            icon={isPending ? "tabler:hourglass-high" : "tabler:alert-circle"}
            className="text-4xl text-[#00ffd5]"
          />
          <div className="flex flex-col gap-1">
            <Text as="h2" size="md" className="font-mono font-bold text-white text-xl">
              {isPending ? "Report Generation in Progress" : "Report Unavailable"}
            </Text>
            <Text size="xs" className="text-fg/70 font-mono">
              {isPending
                ? "The evaluation worker is still compiling scores, evidence citations, and member recommendations."
                : (reportError as Error)?.message || "Could not retrieve the pitch report for this session."}
            </Text>
          </div>

          <div className="flex items-center gap-3 w-full mt-2">
            <Button
              onClick={handleRefresh}
              className="flex-1 h-11 rounded-full text-xs sm:text-sm font-mono"
            >
              <Icon icon="tabler:refresh" className="text-base" />
              <span>Try Again</span>
            </Button>
            <Button
              href="/me"
              variant="glass"
              className="flex-1 h-11 rounded-full text-xs sm:text-sm font-mono"
            >
              <span>My Account</span>
            </Button>
          </div>

          {isPending && (
            <Link
              href={`/sessions/${sessionId}/qa`}
              className="text-xs font-mono text-[#00ffd5] hover:underline mt-2"
            >
              Return to Q&A Session Stage
            </Link>
          )}
        </Wrapper>
      </div>
    );
  }

  // 3. Success State
  return (
    <SessionReportView
      report={report}
      session={session}
      onRefresh={handleRefresh}
    />
  );
}
