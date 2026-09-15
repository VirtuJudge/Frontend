import React from "react";
import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSessionEvents } from "@/hooks/use-session-events";

let messageHandler: ((event: { event: string; data: unknown }) => void) | undefined;
const connect = vi.fn();
const disconnect = vi.fn();

vi.mock("@/lib/api/sse", () => ({
  SseHelper: class {
    constructor(options: { onMessage?: (event: { event: string; data: unknown }) => void }) {
      messageHandler = options.onMessage;
    }

    connect = connect;
    disconnect = disconnect;
  },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useSessionEvents", () => {
  it("renders worker analysis progress received through the authenticated session stream", async () => {
    const { result } = renderHook(() => useSessionEvents("session-1"), { wrapper });

    await waitFor(() => expect(connect).toHaveBeenCalledOnce());
    act(() => {
      messageHandler?.({
        event: "practice_session.analysis_progressed.v1",
        data: {
          sequence: 12,
          practice_session_id: "session-1",
          analysis_attempt_id: "attempt-1",
          analysis_attempt_number: 1,
          stage: "speech",
          status: "running",
          progress: 0.45,
          occurred_at: "2026-09-15T19:24:36Z",
          trace_id: "trace-1",
        },
      });
    });

    expect(result.current.analysisProgress).toMatchObject({
      stage: "speech",
      status: "running",
      progress: 0.45,
    });
  });
});
