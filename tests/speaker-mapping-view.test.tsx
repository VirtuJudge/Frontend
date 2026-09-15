import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SpeakerMappingView } from "@/features/session/speaker-mapping-view";
import { apiClient } from "@/lib/api/client";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

describe("SpeakerMappingView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(apiClient, "getPracticeSession").mockResolvedValue({
      id: "session-1", project_id: "project-1", state: "questions_ready", version: 3,
      created_by: "user-1", created_at: "2026-09-15T00:00:00Z", updated_at: "2026-09-15T00:00:00Z",
    });
    vi.spyOn(apiClient, "getProject").mockResolvedValue({
      id: "project-1", team_id: "team-1", name: "Pitch", created_by: "user-1",
      created_at: "2026-09-15T00:00:00Z", version: 1,
    });
    vi.spyOn(apiClient, "getTeamMembers").mockResolvedValue({ items: [], has_more: false });
  });

  it("derives the team from the project and never fabricates speakers", async () => {
    render(<SpeakerMappingView sessionId="session-1" />);
    expect(await screen.findByText(/Detected speaker labels are not available/i)).toBeDefined();
    expect(apiClient.getProject).toHaveBeenCalledWith("project-1");
    expect(apiClient.getTeamMembers).toHaveBeenCalledWith("team-1");
    expect(screen.queryByText("SPEAKER_00")).toBeNull();
    expect(screen.getByRole("button", { name: /save mappings/i }).hasAttribute("disabled")).toBe(true);
  });

  it("allows Q&A to continue without optional mapping", async () => {
    render(<SpeakerMappingView sessionId="session-1" />);
    await screen.findByText(/Detected speaker labels are not available/i);
    fireEvent.click(screen.getByRole("button", { name: /skip for now/i }));
    expect(push).toHaveBeenCalledWith("/sessions/session-1/qa");
  });

  it("shows a recoverable load error", async () => {
    vi.mocked(apiClient.getPracticeSession).mockRejectedValue(new Error("Network unavailable"));
    render(<SpeakerMappingView sessionId="session-1" />);
    await waitFor(() => expect(screen.getByText("Network unavailable")).toBeDefined());
    expect(screen.getByRole("button", { name: /try again/i })).toBeDefined();
  });
});
