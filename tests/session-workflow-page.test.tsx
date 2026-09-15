import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SessionWorkflowPage from "@/app/(auth)/sessions/[sessionId]/page";
import { apiClient } from "@/lib/api/client";
import type { PracticeSession, SessionState } from "@/lib/api/types";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

function session(state: SessionState): PracticeSession {
  return {
    id: "session-1",
    project_id: "project-1",
    state,
    version: 2,
    created_by: "user-1",
    created_at: "2026-09-15T00:00:00Z",
    updated_at: "2026-09-15T00:00:00Z",
  };
}

async function renderPage(state: SessionState) {
  vi.spyOn(apiClient, "getPracticeSession").mockResolvedValue(session(state));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await React.act(async () => {
    render(
      <QueryClientProvider client={client}>
        <React.Suspense fallback={<div>Suspended</div>}>
          <SessionWorkflowPage params={Promise.resolve({ sessionId: "session-1" })} />
        </React.Suspense>
      </QueryClientProvider>,
    );
  });
}

describe("session workflow coordinator", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows a refresh-safe waiting state while analysis runs", async () => {
    await renderPage("analyzing");
    expect(await screen.findByText("Analyzing your presentation")).toBeDefined();
    expect(replace).not.toHaveBeenCalled();
  });

  it("routes to Q&A only when questions are ready", async () => {
    await renderPage("questions_ready");
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/sessions/session-1/qa"));
  });

  it("routes completed sessions to the real report route", async () => {
    await renderPage("completed");
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/sessions/session-1/report"));
  });
});
