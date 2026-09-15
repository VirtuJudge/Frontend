import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SpeakerMappingView } from "@/features/session/speaker-mapping-view";
import { apiClient } from "@/lib/api/client";
import { PracticeSession, TeamMembership } from "@/lib/api/types";

// Mock router
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("SpeakerMappingView Component", () => {
  const mockSession: PracticeSession = {
    id: "sess-123",
    project_id: "proj-123",
    team_id: "team-123",
    state: "questions_ready",
    manifest_frozen: true,
    presentation_asset_id: "asset-1",
    document_asset_ids: [],
    stages: [
      { stage: "diarization", status: "completed", progress: 1.0 },
      { stage: "questions", status: "completed", progress: 1.0 },
    ],
    speaker_mappings: [
      {
        speaker_id: "SPEAKER_00",
        label: "SPEAKER_00",
        speaker_label: "SPEAKER_00",
        preview: {
          start_ms: 5000,
          end_ms: 18000,
          quote_text: "Welcome to our pitch presentation.",
        },
      },
      {
        speaker_id: "SPEAKER_01",
        label: "SPEAKER_01",
        speaker_label: "SPEAKER_01",
        preview: {
          start_ms: 22000,
          end_ms: 35000,
          quote_text: "Our financial projections show strong growth.",
        },
      },
    ],
    limitations: [],
    created_by: "user-1",
    created_at: "2026-09-15T00:00:00Z",
    updated_at: "2026-09-15T00:00:00Z",
    version: 3,
  };

  const mockMembers: TeamMembership[] = [
    {
      team_id: "team-123",
      user_id: "user-alice",
      role: "owner",
      display_name: "Alice Founder",
      joined_at: "2026-09-01T00:00:00Z",
      version: 1,
    },
    {
      team_id: "team-123",
      user_id: "user-bob",
      role: "member",
      display_name: "Bob Engineer",
      joined_at: "2026-09-02T00:00:00Z",
      version: 1,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(apiClient, "getPracticeSession").mockResolvedValue(mockSession);
    vi.spyOn(apiClient, "getTeamMembers").mockResolvedValue({
      items: mockMembers,
      has_more: false,
    });
    vi.spyOn(apiClient, "saveSpeakerMappings").mockResolvedValue([]);
  });

  it("renders detected speaker labels and preview quotes", async () => {
    render(<SpeakerMappingView sessionId="sess-123" />);

    await waitFor(() => {
      expect(screen.getByText("SPEAKER_00")).toBeDefined();
      expect(screen.getByText("SPEAKER_01")).toBeDefined();
    });

    expect(screen.getByText(/Welcome to our pitch presentation/)).toBeDefined();
    expect(screen.getByText(/Our financial projections show strong growth/)).toBeDefined();
    expect(screen.getByText(/2 Speakers Detected/)).toBeDefined();
  });

  it("lists team members in the dropdown for speaker mapping", async () => {
    render(<SpeakerMappingView sessionId="sess-123" />);

    await waitFor(() => {
      expect(screen.getByText("SPEAKER_00")).toBeDefined();
    });

    const select0 = screen.getByLabelText("Select presenter for SPEAKER_00");
    expect(select0).toBeDefined();

    // Verify option elements
    expect(screen.getAllByText(/Alice Founder \(owner\)/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Bob Engineer \(member\)/i).length).toBeGreaterThan(0);
  });

  it("submits mapped speakers with session version", async () => {
    const onSuccess = vi.fn();
    render(<SpeakerMappingView sessionId="sess-123" onSuccess={onSuccess} />);

    await waitFor(() => {
      expect(screen.getByText("SPEAKER_00")).toBeDefined();
    });

    const select0 = screen.getByLabelText("Select presenter for SPEAKER_00");
    fireEvent.change(select0, { target: { value: "user-alice" } });

    const saveBtn = screen.getByRole("button", { name: /Save Mappings/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(apiClient.saveSpeakerMappings).toHaveBeenCalledWith(
        "sess-123",
        [{ speaker_label: "SPEAKER_00", user_id: "user-alice" }],
        3
      );
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("prevents assigning the same team member to multiple speakers", async () => {
    render(<SpeakerMappingView sessionId="sess-123" />);

    await waitFor(() => {
      expect(screen.getByText("SPEAKER_00")).toBeDefined();
    });

    const select0 = screen.getByLabelText("Select presenter for SPEAKER_00");
    const select1 = screen.getByLabelText("Select presenter for SPEAKER_01");

    // Assign Alice to both SPEAKER_00 and SPEAKER_01
    fireEvent.change(select0, { target: { value: "user-alice" } });
    fireEvent.change(select1, { target: { value: "user-alice" } });

    expect(screen.getAllByText(/already assigned to another speaker/i).length).toBeGreaterThan(0);

    const saveBtn = screen.getByRole("button", { name: /Save Mappings/i });
    expect(saveBtn.hasAttribute("disabled") || saveBtn.getAttribute("aria-disabled") === "true").toBe(true);
  });

  it("shows concurrency conflict modal when 412 is returned", async () => {
    vi.spyOn(apiClient, "saveSpeakerMappings").mockRejectedValue({
      status: 412,
      message: "Precondition Failed",
    });

    render(<SpeakerMappingView sessionId="sess-123" />);

    await waitFor(() => {
      expect(screen.getByText("SPEAKER_00")).toBeDefined();
    });

    const select0 = screen.getByLabelText("Select presenter for SPEAKER_00");
    fireEvent.change(select0, { target: { value: "user-alice" } });

    const saveBtn = screen.getByRole("button", { name: /Save Mappings/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText("Mapping Conflict Detected")).toBeDefined();
    });
  });

  it("supports keyboard navigation across interactive controls", async () => {
    render(<SpeakerMappingView sessionId="sess-123" />);

    await waitFor(() => {
      expect(screen.getByText("SPEAKER_00")).toBeDefined();
    });

    const select0 = screen.getByLabelText("Select presenter for SPEAKER_00");
    const saveBtn = screen.getByRole("button", { name: /Save Mappings/i });
    const skipBtn = screen.getByRole("button", { name: /Skip for Now/i });

    // Ensure elements are focusable
    select0.focus();
    expect(document.activeElement).toBe(select0);

    skipBtn.focus();
    expect(document.activeElement).toBe(skipBtn);

    saveBtn.focus();
    expect(document.activeElement).toBe(saveBtn);
  });
});
