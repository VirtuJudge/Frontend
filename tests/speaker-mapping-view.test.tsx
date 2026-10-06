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

  it("shows waiting state and disables save and skip when no speakers detected yet", async () => {
    render(<SpeakerMappingView sessionId="session-1" />);
    expect(await screen.findByText(/Speaker Detection in Progress/i)).toBeDefined();
    expect(screen.getByText(/Diarization results are not available yet/i)).toBeDefined();
    expect(apiClient.getProject).toHaveBeenCalledWith("project-1");
    expect(apiClient.getTeamMembers).toHaveBeenCalledWith("team-1");
    expect(screen.queryByText("SPEAKER_00")).toBeNull();
    expect(screen.getByRole("button", { name: /save mappings/i }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: /skip for now/i }).hasAttribute("disabled")).toBe(true);
  });

  it("renders detected speakers from session read model and allows mapping", async () => {
    vi.mocked(apiClient.getPracticeSession).mockResolvedValue({
      id: "session-1",
      project_id: "project-1",
      state: "questions_ready",
      version: 3,
      created_by: "user-1",
      created_at: "2026-09-15T00:00:00Z",
      updated_at: "2026-09-15T00:00:00Z",
      detected_speakers: [
        {
          speaker_label: "SPEAKER_00",
          preview: { start_ms: 1000, end_ms: 5000, quote_text: "Welcome to our pitch" },
        },
        {
          speaker_label: "SPEAKER_01",
          preview: { start_ms: 6000, end_ms: 12000, quote_text: "Here is the market size" },
        },
      ],
    });
    vi.mocked(apiClient.getTeamMembers).mockResolvedValue({
      items: [
        { team_id: "team-1", user_id: "user-1", role: "owner", joined_at: "2026-01-01T00:00:00Z", display_name: "Alice", version: 1 },
        { team_id: "team-1", user_id: "user-2", role: "member", joined_at: "2026-01-01T00:00:00Z", display_name: "Bob", version: 1 },
      ],
      has_more: false,
    });
    vi.spyOn(apiClient, "saveSpeakerMappings").mockResolvedValue([]);

    render(<SpeakerMappingView sessionId="session-1" />);
    expect(await screen.findByText("SPEAKER_00")).toBeDefined();
    expect(screen.getByText("SPEAKER_01")).toBeDefined();
    expect(screen.getByText("“Welcome to our pitch”")).toBeDefined();
    expect(screen.getByText("2 Speakers Detected")).toBeDefined();

    // Skip should now be enabled since speakers exist
    const skipButton = screen.getByRole("button", { name: /skip for now/i });
    expect(skipButton.hasAttribute("disabled")).toBe(false);

    // Assign member and save
    const select0 = screen.getByLabelText("Select presenter for SPEAKER_00");
    fireEvent.change(select0, { target: { value: "user-1" } });

    const saveButton = screen.getByRole("button", { name: /save mappings/i });
    expect(saveButton.hasAttribute("disabled")).toBe(false);
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(apiClient.saveSpeakerMappings).toHaveBeenCalledWith(
        "session-1",
        [{ speaker_label: "SPEAKER_00", user_id: "user-1" }],
        3,
      );
    });
    expect(push).toHaveBeenCalledWith("/sessions/session-1/qa");
  });

  it("shows a recoverable load error", async () => {
    vi.mocked(apiClient.getPracticeSession).mockRejectedValue(new Error("Network unavailable"));
    render(<SpeakerMappingView sessionId="session-1" />);
    await waitFor(() => expect(screen.getByText("Network unavailable")).toBeDefined());
    expect(screen.getByRole("button", { name: /try again/i })).toBeDefined();
  });
});
