"use client";

import { use, useEffect } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Icon } from "@iconify/react";
import { Button, Text, Wrapper } from "@/components";
import { apiClient } from "@/lib/api/client";
import { SessionReportView } from "@/features/reports";

export default function SessionReportPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const queryClient = useQueryClient();
  const reportQuery = useQuery({ queryKey: ["report", sessionId], queryFn: () => apiClient.getReport(sessionId), retry: false });
  const sessionQuery = useQuery({
    queryKey: ["practice-session", sessionId],
    queryFn: () => apiClient.getPracticeSession(sessionId),
    refetchInterval: (query) => query.state.data?.state === "report_generating" ? 4000 : false,
  });
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["report", sessionId] });
    reportQuery.refetch();
  };

  useEffect(() => {
    if (sessionQuery.data?.state === "completed" && reportQuery.isError) {
      void reportQuery.refetch();
    }
  }, [reportQuery.isError, reportQuery.refetch, sessionQuery.data?.state]);

  if (reportQuery.isLoading) {
    return <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center"><Icon icon="tabler:loader-2" className="animate-spin text-4xl text-primary" /><Text size="md">Loading session report...</Text></div>;
  }
  if (reportQuery.isError || !reportQuery.data) {
    const pending = sessionQuery.data?.state === "report_generating";
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center">
        <Wrapper variant="glass-dark" className="flex w-full flex-col items-center gap-4 rounded-3xl p-8">
          <Icon icon={pending ? "tabler:hourglass-high" : "tabler:alert-circle"} className="text-4xl text-primary" />
          <Text as="h1" size="md" className="font-bold">{pending ? "Report Generation in Progress" : "Report Unavailable"}</Text>
          <Text size="xs" className="text-fg/70">{pending ? "The final evaluation is still being generated." : reportQuery.error instanceof Error ? reportQuery.error.message : "The report could not be loaded."}</Text>
          <Button onClick={handleRefresh}>Try Again</Button>
          <Link href={`/sessions/${sessionId}`} className="text-xs text-primary hover:underline">Return to session status</Link>
        </Wrapper>
      </div>
    );
  }
  return <SessionReportView report={reportQuery.data} session={sessionQuery.data} onRefresh={handleRefresh} />;
}
