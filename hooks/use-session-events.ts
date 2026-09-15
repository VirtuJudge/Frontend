"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { API_ENDPOINTS, apiClient } from "@/lib/api/client";
import { SseEvent, SseHelper } from "@/lib/api/sse";
import type { AnalysisProgressedEvent } from "@/lib/api/types";

const SESSION_EVENTS = {
  updated: "practice_session.updated.v1",
  progress: "practice_session.analysis_progressed.v1",
  questionAvailable: "qa.question_available.v1",
  answerUpdated: "qa.answer_updated.v1",
  reportReady: "report.ready.v1",
  erasureUpdated: "erasure.updated.v1",
  resyncRequired: "practice_session.resync_required.v1",
} as const;

export interface UseSessionEventsReturn {
  analysisProgress: AnalysisProgressedEvent | null;
}

function isSessionEvent(data: unknown, sessionId: string): data is { sequence: number; practice_session_id: string } {
  return (
    typeof data === "object" &&
    data !== null &&
    "sequence" in data &&
    "practice_session_id" in data &&
    typeof data.sequence === "number" &&
    Number.isInteger(data.sequence) &&
    data.sequence >= 0 &&
    data.practice_session_id === sessionId
  );
}

function isAnalysisProgress(data: unknown, sessionId: string): data is AnalysisProgressedEvent {
  return (
    isSessionEvent(data, sessionId) &&
    "analysis_attempt_id" in data &&
    "analysis_attempt_number" in data &&
    "stage" in data &&
    "status" in data &&
    "progress" in data &&
    typeof data.analysis_attempt_id === "string" &&
    typeof data.analysis_attempt_number === "number" &&
    typeof data.stage === "string" &&
    typeof data.status === "string" &&
    typeof data.progress === "number" &&
    data.progress >= 0 &&
    data.progress <= 1
  );
}

export function useSessionEvents(sessionId: string): UseSessionEventsReturn {
  const queryClient = useQueryClient();
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgressedEvent | null>(null);
  const lastSequence = useRef<number | null>(null);

  useEffect(() => {
    if (!sessionId || typeof window === "undefined") return;

    lastSequence.current = null;

    const resync = () => {
      setAnalysisProgress(null);
      void queryClient.invalidateQueries({ queryKey: ["practice-session", sessionId] });
      void queryClient.invalidateQueries({ queryKey: ["qa-round", sessionId] });
      void queryClient.invalidateQueries({ queryKey: ["report", sessionId] });
    };
    const onMessage = (event: SseEvent) => {
      if (!isSessionEvent(event.data, sessionId)) return;

      if (event.event === SESSION_EVENTS.resyncRequired) {
        lastSequence.current = event.data.sequence;
        resync();
        return;
      }

      if (
        lastSequence.current !== null &&
        event.data.sequence !== lastSequence.current + 1
      ) {
        lastSequence.current = event.data.sequence;
        resync();
        return;
      }
      lastSequence.current = event.data.sequence;

      if (isAnalysisProgress(event.data, sessionId)) {
        setAnalysisProgress(event.data);
      }

      if (
        event.event === SESSION_EVENTS.updated ||
        event.event === SESSION_EVENTS.progress ||
        event.event === SESSION_EVENTS.erasureUpdated
      ) {
        void queryClient.invalidateQueries({ queryKey: ["practice-session", sessionId] });
      }
      if (
        event.event === SESSION_EVENTS.questionAvailable ||
        event.event === SESSION_EVENTS.answerUpdated
      ) {
        void queryClient.invalidateQueries({ queryKey: ["qa-round", sessionId] });
      }
      if (event.event === SESSION_EVENTS.reportReady) {
        void queryClient.invalidateQueries({ queryKey: ["report", sessionId] });
        void queryClient.invalidateQueries({ queryKey: ["practice-session", sessionId] });
      }
    };

    const sse = new SseHelper({
      url: apiClient.resolveUrl(API_ENDPOINTS.sessionEvents(sessionId)),
      getToken: () => apiClient.getAuthToken(),
      onMessage,
    });
    sse.connect();

    return () => sse.disconnect();
  }, [queryClient, sessionId]);

  return {
    analysisProgress:
      analysisProgress?.practice_session_id === sessionId ? analysisProgress : null,
  };
}
