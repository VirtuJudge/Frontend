import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SpeakerMappingView } from "@/features/session/speaker-mapping-view";
import { apiClient, ApiClientError } from "@/lib/api/client";
import { UNCERTAIN_SPEAKER_VALUE } from "@/hooks/session/use-speaker-mapping";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

describe("SpeakerMappingView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(apiClient, "getPracticeSession").mockResolvedValue({
      id: "session-1",
      project_id: "project-1",
      state: "questions_ready",
      version: 3,
      created_by: "user-1",
      created_at: "2026-09-15T00:00:00Z",
      updated_at: "2026-09-15T00:00:00Z",
    });
    vi.spyOn(apiClient, "getProject").mockResolvedValue({
      id: "project-1",
      team_id: "team-1",
      name: "Pitch",
      created_by: "user-1",
      created_at: "2026-09-15T00:00:00Z",
      version: 1,
    });
    vi.spyOn(apiClient, "getTeamMembers").mockResolvedValue({
      items: [],
      has_more: false,
    });
  });

  it("shows waiting state and disables save and skip when no speakers detected yet", async () => {
    render(<SpeakerMappingView sessionId="session-1" />);
    expect(
      await screen.findByText(/Speaker Detection in Progress/i),
    ).toBeDefined();
    expect(
      screen.getByText(/Diarization results are not available yet/i),
    ).toBeDefined();
    expect(apiClient.getProject).toHaveBeenCalledWith("project-1");
    expect(apiClient.getTeamMembers).toHaveBeenCalledWith("team-1");
    expect(screen.queryByText("SPEAKER_00")).toBeNull();
    expect(
      screen.getByRole("button", { name: /save mappings/i }).hasAttribute("disabled"),
    ).toBe(true);
    expect(
      screen.getByRole("button", { name: /skip for now/i }).hasAttribute("disabled"),
    ).toBe(true);
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
          preview: {
            start_ms: 1000,
            end_ms: 5000,
            quote_text: "Welcome to our pitch",
          },
        },
        {
          speaker_label: "SPEAKER_01",
          preview: {
            start_ms: 6000,
            end_ms: 12000,
            quote_text: "Here is the market size",
          },
        },
      ],
    });
    vi.mocked(apiClient.getTeamMembers).mockResolvedValue({
      items: [
        {
          team_id: "team-1",
          user_id: "user-1",
          role: "owner",
          joined_at: "2026-01-01T00:00:00Z",
          display_name: "Alice",
          version: 1,
        },
        {
          team_id: "team-1",
          user_id: "user-2",
          role: "member",
          joined_at: "2026-01-01T00:00:00Z",
          display_name: "Bob",
          version: 1,
        },
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
    expect(push).toHaveBeenCalledWith("/sessions/session-1/report");
  });

  it("handles duplicate member assignments with conflict state and disables save", async () => {
    vi.mocked(apiClient.getPracticeSession).mockResolvedValue({
      id: "session-1",
      project_id: "project-1",
      state: "questions_ready",
      version: 3,
      created_by: "user-1",
      created_at: "2026-09-15T00:00:00Z",
      updated_at: "2026-09-15T00:00:00Z",
      detected_speakers: [
        { speaker_label: "SPEAKER_00" },
        { speaker_label: "SPEAKER_01" },
      ],
    });
    vi.mocked(apiClient.getTeamMembers).mockResolvedValue({
      items: [
        {
          team_id: "team-1",
          user_id: "user-1",
          role: "owner",
          joined_at: "2026-01-01T00:00:00Z",
          display_name: "Alice",
          version: 1,
        },
      ],
      has_more: false,
    });

    render(<SpeakerMappingView sessionId="session-1" />);
    expect(await screen.findByText("SPEAKER_00")).toBeDefined();

    // Assign user-1 to SPEAKER_00 and SPEAKER_01
    const select0 = screen.getByLabelText("Select presenter for SPEAKER_00");
    const select1 = screen.getByLabelText("Select presenter for SPEAKER_01");
    fireEvent.change(select0, { target: { value: "user-1" } });
    fireEvent.change(select1, { target: { value: "user-1" } });

    // Expect conflict state on cards and disabled save button
    expect(
      screen.getAllByText(/Team member already assigned to another speaker/i),
    ).toHaveLength(2);
    const saveButton = screen.getByRole("button", { name: /save mappings/i });
    expect(saveButton.hasAttribute("disabled")).toBe(true);
  });

  it("supports unmapped and uncertain speakers without inventing identities", async () => {
    vi.mocked(apiClient.getPracticeSession).mockResolvedValue({
      id: "session-1",
      project_id: "project-1",
      state: "questions_ready",
      version: 3,
      created_by: "user-1",
      created_at: "2026-09-15T00:00:00Z",
      updated_at: "2026-09-15T00:00:00Z",
      detected_speakers: [
        { speaker_label: "SPEAKER_00" },
        { speaker_label: "SPEAKER_01" },
        { speaker_label: "SPEAKER_02" },
      ],
    });
    vi.mocked(apiClient.getTeamMembers).mockResolvedValue({
      items: [
        {
          team_id: "team-1",
          user_id: "user-1",
          role: "owner",
          joined_at: "2026-01-01T00:00:00Z",
          display_name: "Alice",
          version: 1,
        },
      ],
      has_more: false,
    });
    vi.spyOn(apiClient, "saveSpeakerMappings").mockResolvedValue([]);

    render(<SpeakerMappingView sessionId="session-1" />);
    expect(await screen.findByText("SPEAKER_00")).toBeDefined();

    // Assign SPEAKER_00 to user-1
    const select0 = screen.getByLabelText("Select presenter for SPEAKER_00");
    fireEvent.change(select0, { target: { value: "user-1" } });

    // Mark SPEAKER_01 as uncertain
    const select1 = screen.getByLabelText("Select presenter for SPEAKER_01");
    fireEvent.change(select1, { target: { value: UNCERTAIN_SPEAKER_VALUE } });

    // Leave SPEAKER_02 unmapped (empty)
    const select2 = screen.getByLabelText("Select presenter for SPEAKER_02");
    fireEvent.change(select2, { target: { value: "" } });

    expect(screen.getByText("Uncertain (Anonymous)")).toBeDefined();
    expect(screen.getByText("Unmapped")).toBeDefined();

    // Submit mappings
    const saveButton = screen.getByRole("button", { name: /save mappings/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      // Only SPEAKER_00 is submitted. Neither uncertain nor unmapped invent identities.
      expect(apiClient.saveSpeakerMappings).toHaveBeenCalledWith(
        "session-1",
        [{ speaker_label: "SPEAKER_00", user_id: "user-1" }],
        3,
      );
    });
  });

  it("shows optimistic concurrency conflict modal when session is stale (412) and allows reload", async () => {
    vi.mocked(apiClient.getPracticeSession).mockResolvedValue({
      id: "session-1",
      project_id: "project-1",
      state: "questions_ready",
      version: 3,
      created_by: "user-1",
      created_at: "2026-09-15T00:00:00Z",
      updated_at: "2026-09-15T00:00:00Z",
      detected_speakers: [{ speaker_label: "SPEAKER_00" }],
    });
    vi.mocked(apiClient.getTeamMembers).mockResolvedValue({
      items: [
        {
          team_id: "team-1",
          user_id: "user-1",
          role: "owner",
          joined_at: "2026-01-01T00:00:00Z",
          display_name: "Alice",
          version: 1,
        },
      ],
      has_more: false,
    });
    const conflictError = new ApiClientError(412, {
      type: "about:blank",
      title: "Precondition Failed",
      status: 412,
      detail: "Resource version does not match expected version.",
      instance: "/api/v1/practice-sessions/session-1/speaker-mappings",
      code: "precondition_failed",
    });
    vi.spyOn(apiClient, "saveSpeakerMappings").mockRejectedValue(conflictError);

    render(<SpeakerMappingView sessionId="session-1" />);
    expect(await screen.findByText("SPEAKER_00")).toBeDefined();

    const select0 = screen.getByLabelText("Select presenter for SPEAKER_00");
    fireEvent.change(select0, { target: { value: "user-1" } });

    const saveButton = screen.getByRole("button", { name: /save mappings/i });
    fireEvent.click(saveButton);

    // Expect conflict modal
    expect(
      await screen.findByText("Mapping Conflict Detected"),
    ).toBeDefined();
    expect(
      screen.getByText(
        /Another team member has updated the session state or speaker mappings/i,
      ),
    ).toBeDefined();

    // Reload latest mappings from modal
    const reloadButton = screen.getByRole("button", {
      name: /Reload Latest Mappings/i,
    });
    fireEvent.click(reloadButton);

    await waitFor(() => {
      // Verifies getPracticeSession was called again to reload canonical state
      expect(apiClient.getPracticeSession).toHaveBeenCalledTimes(2);
    });
  });

  it("restricts private transcript previews when user is unauthorized (403)", async () => {
    const forbiddenError = new ApiClientError(403, {
      type: "about:blank",
      title: "Forbidden",
      status: 403,
      detail: "User is not authorized to perform action on this session.",
      instance: "/api/v1/practice-sessions/session-1",
      code: "forbidden",
    });
    vi.mocked(apiClient.getPracticeSession).mockRejectedValue(forbiddenError);

    render(<SpeakerMappingView sessionId="session-1" />);
    expect(
      await screen.findByText("Private Previews Restricted"),
    ).toBeDefined();
    expect(
      screen.getByText(/Forbidden: You are not authorized to view private transcript previews/i),
    ).toBeDefined();
  });

  it("routes completed sessions to the report view upon successful mapping save", async () => {
    vi.mocked(apiClient.getPracticeSession).mockResolvedValue({
      id: "session-1",
      project_id: "project-1",
      state: "completed",
      version: 4,
      created_by: "user-1",
      created_at: "2026-09-15T00:00:00Z",
      updated_at: "2026-09-15T00:00:00Z",
      detected_speakers: [{ speaker_label: "SPEAKER_00" }],
    });
    vi.mocked(apiClient.getTeamMembers).mockResolvedValue({
      items: [
        {
          team_id: "team-1",
          user_id: "user-1",
          role: "owner",
          joined_at: "2026-01-01T00:00:00Z",
          display_name: "Alice",
          version: 1,
        },
      ],
      has_more: false,
    });
    vi.spyOn(apiClient, "saveSpeakerMappings").mockResolvedValue([]);

    render(<SpeakerMappingView sessionId="session-1" />);
    expect(await screen.findByText("SPEAKER_00")).toBeDefined();

    const select0 = screen.getByLabelText("Select presenter for SPEAKER_00");
    fireEvent.change(select0, { target: { value: "user-1" } });

    const saveButton = screen.getByRole("button", { name: /save mappings/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/sessions/session-1/report");
    });
  });

  it("supports keyboard shortcut Ctrl+S to save mappings", async () => {
    vi.mocked(apiClient.getPracticeSession).mockResolvedValue({
      id: "session-1",
      project_id: "project-1",
      state: "questions_ready",
      version: 3,
      created_by: "user-1",
      created_at: "2026-09-15T00:00:00Z",
      updated_at: "2026-09-15T00:00:00Z",
      detected_speakers: [{ speaker_label: "SPEAKER_00" }],
    });
    vi.mocked(apiClient.getTeamMembers).mockResolvedValue({
      items: [
        {
          team_id: "team-1",
          user_id: "user-1",
          role: "owner",
          joined_at: "2026-01-01T00:00:00Z",
          display_name: "Alice",
          version: 1,
        },
      ],
      has_more: false,
    });
    vi.spyOn(apiClient, "saveSpeakerMappings").mockResolvedValue([]);

    render(<SpeakerMappingView sessionId="session-1" />);
    expect(await screen.findByText("SPEAKER_00")).toBeDefined();

    const select0 = screen.getByLabelText("Select presenter for SPEAKER_00");
    fireEvent.change(select0, { target: { value: "user-1" } });

    // Press Ctrl+S
    fireEvent.keyDown(window, { key: "s", ctrlKey: true });

    await waitFor(() => {
      expect(apiClient.saveSpeakerMappings).toHaveBeenCalledWith(
        "session-1",
        [{ speaker_label: "SPEAKER_00", user_id: "user-1" }],
        3,
      );
    });
  });

  it("shows a recoverable load error", async () => {
    vi.mocked(apiClient.getPracticeSession).mockRejectedValue(
      new Error("Network unavailable"),
    );
    render(<SpeakerMappingView sessionId="session-1" />);
    await waitFor(() =>
      expect(screen.getByText("Network unavailable")).toBeDefined(),
    );
    expect(screen.getByRole("button", { name: /try again/i })).toBeDefined();
  });
});
