"use client";

import { use, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { Button, Text, Wrapper } from "@/components";
import { apiClient } from "@/lib/api/client";
import { generateIdempotencyKey } from "@/lib/upload/idempotency";

export default function SessionWorkflowPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const router = useRouter();
  const sessionQuery = useQuery({
    queryKey: ["practice-session", sessionId],
    queryFn: () => apiClient.getPracticeSession(sessionId),
    refetchInterval: (query) => {
      const state = query.state.data?.state;
      return state && ["completed", "failed", "cancelled"].includes(state) ? false : 4000;
    },
    refetchOnWindowFocus: true,
  });
  const startAttempt = useMutation({
    mutationFn: () => apiClient.createAnalysisAttempt(sessionId, generateIdempotencyKey("analysis")),
    onSuccess: () => sessionQuery.refetch(),
  });
  const state = sessionQuery.data?.state;

  useEffect(() => {
    if (state === "questions_ready" || state === "questions_in_progress") {
      router.replace(`/sessions/${sessionId}/qa`);
    } else if (state === "completed") {
      router.replace(`/sessions/${sessionId}/report`);
    }
  }, [router, sessionId, state]);

  if (sessionQuery.isLoading) {
    return <WorkflowCard icon="tabler:loader-2" spinning title="Loading session" detail="Reading the latest workflow state from VirtuJudge." />;
  }
  if (sessionQuery.isError || !sessionQuery.data) {
    return (
      <WorkflowCard icon="tabler:alert-triangle" title="Unable to load session" detail={sessionQuery.error instanceof Error ? sessionQuery.error.message : "The session could not be loaded."}>
        <Button onClick={() => sessionQuery.refetch()}>Try Again</Button>
      </WorkflowCard>
    );
  }
  if (state === "draft") {
    return (
      <WorkflowCard icon="tabler:file-alert" title="Session preparation did not finish" detail="The session exists, but its verified assets were not finalized. Return to the project and submit the recording again.">
        <Button href={`/projects/${sessionQuery.data.project_id}`}>Return to Project</Button>
      </WorkflowCard>
    );
  }
  if (state === "ready") {
    return (
      <WorkflowCard icon="tabler:player-play" title="Ready to start analysis" detail="The files are verified, but no active analysis is running. You can safely retry starting it.">
        <Button onClick={() => startAttempt.mutate()} loading={startAttempt.isPending}>Start Analysis</Button>
        {startAttempt.error instanceof Error && <Text size="xs" className="text-danger">{startAttempt.error.message}</Text>}
      </WorkflowCard>
    );
  }
  if (state === "failed") {
    return (
      <WorkflowCard icon="tabler:alert-circle" title="Analysis failed" detail="VirtuJudge could not finish this analysis. Return to the project to review the assets or retry when the service is available.">
        <Button href={`/projects/${sessionQuery.data.project_id}`}>Return to Project</Button>
      </WorkflowCard>
    );
  }
  if (state === "cancelled") {
    return <WorkflowCard icon="tabler:circle-x" title="Session cancelled" detail="This practice session is no longer active." />;
  }
  if (state === "report_generating") {
    return <WorkflowCard icon="tabler:file-analytics" spinning title="Creating your report" detail="Your answers are complete. VirtuJudge is calculating scores, citations, and recommendations." />;
  }
  return <WorkflowCard icon="tabler:brain" spinning title="Analyzing your presentation" detail="VirtuJudge is processing the presentation and supporting documents. This page updates automatically and is safe to refresh." />;
}

function WorkflowCard({ icon, spinning = false, title, detail, children }: { icon: string; spinning?: boolean; title: string; detail: string; children?: React.ReactNode }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#000f0e] p-4 text-white">
      <Wrapper variant="glass-dark" className="flex w-full max-w-lg flex-col items-center gap-5 rounded-3xl p-8 text-center">
        <Icon icon={icon} className={`text-5xl text-primary ${spinning ? "animate-pulse" : ""}`} />
        <div className="flex flex-col gap-2">
          <Text as="h1" size="lg" className="font-bold">{title}</Text>
          <Text size="sm" className="text-white/65">{detail}</Text>
        </div>
        {children}
      </Wrapper>
    </div>
  );
}
