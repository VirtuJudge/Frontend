import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TeamSelector, MemberList, InvitationsList } from "@/features/teams";
import { MOCK_DATA } from "@/lib/api/client";
import { TeamMembership, TeamInvitation } from "@/lib/api/types";
import LoginPage from "@/app/(public)/auth/login/page";
import { InvitationPreviewContent } from "@/app/(public)/invitations/[token]/page";
import { AuthProvider } from "@/features/auth";

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{ui}</AuthProvider>
    </QueryClientProvider>,
  );
}

describe("Access and Teams - Screens and Components", () => {
  describe("Sign In Screen (LoginPage)", () => {
    it("renders sign-in header and authentication options", () => {
      renderWithProviders(<LoginPage />);

      expect(screen.getByText(/welcome back/i)).toBeDefined();
      expect(
        screen.getByRole("button", { name: /login/i }),
      ).toBeDefined();
    });
  });

  describe("TeamSelector Component", () => {
    it("displays user teams with roles and member count", () => {
      const mockTeams = MOCK_DATA.teams;
      const onSelect = vi.fn();
      const onCreated = vi.fn();

      render(
        <TeamSelector
          teams={mockTeams}
          selectedTeamId={mockTeams[0].id}
          onSelectTeam={onSelect}
          onTeamCreated={onCreated}
        />,
      );

      expect(screen.getByText("VirtuJudge Pitch Team")).toBeDefined();
      expect(screen.getByText("owner")).toBeDefined();
      expect(screen.getByText("3 members")).toBeDefined();

      const newTeamBtn = screen.getByRole("button", { name: /\+ new team/i });
      expect(newTeamBtn).toBeDefined();
    });
  });

  describe("MemberList Component", () => {
    const mockMembers: TeamMembership[] = [
      {
        team_id: "team_1",
        user_id: "user_owner",
        role: "owner",
        display_name: "Alex Presenter",
        joined_at: "2026-09-01T10:00:00Z",
        version: 1,
      },
      {
        team_id: "team_1",
        user_id: "user_member_1",
        role: "member",
        display_name: "Morgan Engineer",
        joined_at: "2026-09-02T10:00:00Z",
        version: 1,
      },
    ];

    it("displays member names and role badges", () => {
      const onRemove = vi.fn();
      render(
        <MemberList
          teamId="team_1"
          members={mockMembers}
          currentUserRole="owner"
          currentUserId="user_owner"
          onMemberRemoved={onRemove}
        />,
      );

      expect(screen.getByText("Alex Presenter")).toBeDefined();
      expect(screen.getByText("Morgan Engineer")).toBeDefined();
      expect(screen.getByText("You")).toBeDefined();
    });

    it("protects primary owner from accidental removal", () => {
      const onRemove = vi.fn();
      render(
        <MemberList
          teamId="team_1"
          members={mockMembers}
          currentUserRole="owner"
          currentUserId="user_owner"
          onMemberRemoved={onRemove}
        />,
      );

      // The owner row should show "Primary Owner" safeguard instead of a remove button
      expect(screen.getByText("Primary Owner")).toBeDefined();

      // The non-owner member row has a remove button
      const removeButtons = screen.getAllByRole("button", { name: /remove/i });
      expect(removeButtons.length).toBe(1);
    });

    it("requires explicit confirmation before member removal", () => {
      const onRemove = vi.fn();
      render(
        <MemberList
          teamId="team_1"
          members={mockMembers}
          currentUserRole="owner"
          currentUserId="user_owner"
          onMemberRemoved={onRemove}
        />,
      );

      const removeBtn = screen.getByRole("button", { name: /remove/i });
      fireEvent.click(removeBtn);

      expect(screen.getByText("Confirm?")).toBeDefined();
      expect(
        screen.getByRole("button", { name: /yes, remove/i }),
      ).toBeDefined();
    });

    it("hides removal controls from non-owner members", () => {
      const onRemove = vi.fn();
      render(
        <MemberList
          teamId="team_1"
          members={mockMembers}
          currentUserRole="member"
          currentUserId="user_member_1"
          onMemberRemoved={onRemove}
        />,
      );

      expect(screen.queryByRole("button", { name: /remove/i })).toBeNull();
    });
  });

  describe("InvitationsList Component", () => {
    const mockInvitations: TeamInvitation[] = [
      {
        id: "inv_1",
        team_id: "team_1",
        email: "sent@example.com",
        role: "member",
        status: "pending",
        delivery_status: "accepted_by_gmail",
        delivery_attempts: 1,
        expires_at: "2026-09-14T12:00:00Z",
        created_at: "2026-09-07T10:00:00Z",
      },
      {
        id: "inv_2",
        team_id: "team_1",
        email: "queued@example.com",
        role: "member",
        status: "pending",
        delivery_status: "queued",
        delivery_attempts: 0,
        expires_at: "2026-09-14T12:00:00Z",
        created_at: "2026-09-07T11:00:00Z",
      },
      {
        id: "inv_3",
        team_id: "team_1",
        email: "failed@example.com",
        role: "member",
        status: "pending",
        delivery_status: "failed",
        delivery_attempts: 3,
        expires_at: "2026-09-14T12:00:00Z",
        created_at: "2026-09-07T08:00:00Z",
      },
    ];

    it("renders safe delivery status badges without exposing internal provider details", () => {
      const onUpdate = vi.fn();
      render(
        <InvitationsList
          teamId="team_1"
          invitations={mockInvitations}
          onInvitationUpdated={onUpdate}
        />,
      );

      expect(screen.getByText("sent@example.com")).toBeDefined();
      expect(screen.getByText("Sent successfully")).toBeDefined();

      expect(screen.getByText("queued@example.com")).toBeDefined();
      expect(screen.getByText(/dispatching via mail server/i)).toBeDefined();

      expect(screen.getByText("failed@example.com")).toBeDefined();
      expect(screen.getByText(/delivery failed \(3 attempts\)/i)).toBeDefined();

      // Verify no SMTP or raw credential strings appear
      expect(screen.queryByText(/smtp/i)).toBeNull();
      expect(screen.queryByText(/password/i)).toBeNull();
    });
  });

  describe("InvitationPreviewPage Component", () => {
    it("renders public invitation preview with masked email", async () => {
      renderWithProviders(<InvitationPreviewContent token="test_token_123" />);

      expect(
        await screen.findByText(/join virtujudge pitch team/i),
      ).toBeDefined();
      expect(screen.getByText("Alex Presenter")).toBeDefined();
      expect(screen.getByText("a***@example.com")).toBeDefined();
      expect(
        screen.getByRole("link", { name: /sign in to accept invitation/i }),
      ).toBeDefined();
    });
  });
});
