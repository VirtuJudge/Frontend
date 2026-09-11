import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TeamSelector, MemberList, InvitationsList } from "@/features/teams";
import { apiClient, ApiClientError, MOCK_DATA } from "@/lib/api/client";
import { TeamMembership, TeamInvitation } from "@/lib/api/types";
import LoginPage from "@/app/(public)/auth/login/page";
import { InvitationPreviewContent } from "@/app/(public)/invitations/[token]/page";
import { InvitationAcceptContent } from "@/app/(public)/invitations/[token]/accept/page";
import { AuthProvider } from "@/features/auth";
import { setClientAuthToken, removeClientAuthToken } from "@/lib/auth/cookies";
import { createSyntheticJwt } from "@/lib/auth/jwt";

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
      expect(screen.getByText(/\(?You\)?/i)).toBeDefined();
    });

    it("protects primary owner and provides Manage button for other members", () => {
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

      // The owner row should show "Team Owner" safeguard
      expect(screen.getByText(/Team Owner|Primary Owner/i)).toBeDefined();

      // The non-owner member row has a Manage button
      const manageButtons = screen.getAllByRole("button", { name: /manage/i });
      expect(manageButtons.length).toBe(1);
    });

    it("opens manage modal and allows member removal with explicit confirmation", () => {
      const onRemove = vi.fn();
      render(
        <MemberList
          teamId="team_1"
          teamName="VirtuJudge Test Team"
          members={mockMembers}
          currentUserRole="owner"
          currentUserId="user_owner"
          onMemberRemoved={onRemove}
        />,
      );

      const manageBtn = screen.getByRole("button", { name: /manage/i });
      fireEvent.click(manageBtn);

      // Modal opens with member details and options
      expect(screen.getByText(/Manage (a team member|Morgan Engineer)/i)).toBeDefined();
      expect(screen.getByRole("button", { name: /remove member/i })).toBeDefined();

      // Click Remove Member to enter confirmation view
      fireEvent.click(screen.getByRole("button", { name: /remove member/i }));
      expect(screen.getByText(/Confirm Member Removal/i)).toBeDefined();

      // Check the confirmation checkbox to unlock removal button
      const confirmCheckbox = screen.getByRole("checkbox");
      fireEvent.click(confirmCheckbox);

      const confirmBtn = screen.getByRole("button", { name: /(yes, )?remove member/i });
      expect(confirmBtn).toBeDefined();
    });

    it("enforces GitHub-style multi-confirmation and typed text for ownership transfer", () => {
      const onTransfer = vi.fn();
      render(
        <MemberList
          teamId="team_1"
          teamName="VirtuJudge Test Team"
          members={mockMembers}
          currentUserRole="owner"
          currentUserId="user_owner"
          onMemberRemoved={vi.fn()}
          onOwnershipTransferred={onTransfer}
        />,
      );

      // Open manage modal
      fireEvent.click(screen.getByRole("button", { name: /manage/i }));

      // Click Transfer Ownership option
      fireEvent.click(screen.getByRole("button", { name: /transfer ownership/i }));

      // GitHub-style danger alert and warning
      expect(screen.getByText(/Warning: Irreversible Ownership Transfer/i)).toBeDefined();

      const transferBtn = screen.getByRole("button", {
        name: /(i understand the consequences, )?transfer ownership/i,
      }) as HTMLButtonElement;
      expect(transferBtn.disabled).toBe(true);

      // Must check both checkboxes
      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes.length).toBe(2);
      fireEvent.click(checkboxes[0]);
      fireEvent.click(checkboxes[1]);

      // Button is still disabled because text has not been typed yet
      expect(transferBtn.disabled).toBe(true);

      // Type the required team name
      const input = screen.getByLabelText(/confirm ownership transfer/i);
      fireEvent.change(input, { target: { value: "Wrong Team Name" } });
      expect(transferBtn.disabled).toBe(true);

      fireEvent.change(input, { target: { value: "VirtuJudge Test Team" } });
      expect(transferBtn.disabled).toBe(false);
    });

    it("hides management controls from non-owner members", () => {
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

      expect(screen.queryByRole("button", { name: /manage/i })).toBeNull();
    });

    it("does not render invite member button in MemberList", () => {
      render(
        <MemberList
          teamId="team_1"
          members={mockMembers}
          currentUserRole="owner"
          currentUserId="user_owner"
          onMemberRemoved={vi.fn()}
        />,
      );

      expect(screen.queryByRole("button", { name: /invite member/i })).toBeNull();
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

    it("renders table matching MemberList UI with role badge and manage button", () => {
      const onUpdate = vi.fn();
      render(
        <InvitationsList
          teamId="team_1"
          invitations={mockInvitations}
          onInvitationUpdated={onUpdate}
        />,
      );

      // Verify table headers matching MemberList style
      expect(screen.getByRole("columnheader", { name: /recipient/i })).toBeDefined();
      expect(screen.getByRole("columnheader", { name: /role/i })).toBeDefined();
      expect(screen.getByRole("columnheader", { name: /delivery status/i })).toBeDefined();
      expect(screen.getByRole("columnheader", { name: /expires/i })).toBeDefined();
      expect(screen.getByRole("columnheader", { name: /action/i })).toBeDefined();

      // Verify Manage buttons rendered for each pending invitation
      const manageButtons = screen.getAllByRole("button", { name: /manage/i });
      expect(manageButtons.length).toBe(3);
    });

    it("opens manage invitation modal and allows resending email and revoking with confirmation", async () => {
      const onUpdate = vi.fn();
      const resendSpy = vi.spyOn(apiClient, "resendInvitation").mockResolvedValue({
        ...mockInvitations[0],
        delivery_status: "accepted_by_gmail",
        delivery_attempts: 2,
      });
      const revokeSpy = vi.spyOn(apiClient, "revokeInvitation").mockResolvedValue();

      render(
        <InvitationsList
          teamId="team_1"
          invitations={mockInvitations}
          onInvitationUpdated={onUpdate}
        />,
      );

      // Click first Manage button
      const manageButtons = screen.getAllByRole("button", { name: /manage/i });
      fireEvent.click(manageButtons[0]);

      // Modal opens
      expect(screen.getByText(/Manage Invitation/i)).toBeDefined();
      expect(screen.getByRole("button", { name: /resend email/i })).toBeDefined();
      expect(screen.getByRole("button", { name: /revoke/i })).toBeDefined();

      // Click resend
      fireEvent.click(screen.getByRole("button", { name: /resend email/i }));
      expect(resendSpy).toHaveBeenCalledWith("team_1", "inv_1", expect.any(String));
      await waitFor(() => {
        expect(screen.getByText(/Invitation email resent successfully!/i)).toBeDefined();
      });

      // Click revoke to open confirmation view
      fireEvent.click(screen.getByRole("button", { name: /revoke/i }));
      expect(screen.getByText(/Warning: Revoke Invitation/i)).toBeDefined();

      // Revoke button disabled until checkbox checked
      const confirmRevokeBtn = screen.getByRole("button", { name: /revoke invitation/i }) as HTMLButtonElement;
      expect(confirmRevokeBtn.disabled).toBe(true);

      const checkbox = screen.getByRole("checkbox");
      fireEvent.click(checkbox);
      expect(confirmRevokeBtn.disabled).toBe(false);

      // Confirm revoke
      fireEvent.click(confirmRevokeBtn);
      expect(revokeSpy).toHaveBeenCalledWith("team_1", "inv_1");
      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalled();
      });
    });

    it("renders invite member button and opens invite modal", () => {
      render(
        <InvitationsList
          teamId="team_1"
          invitations={mockInvitations}
          onInvitationUpdated={vi.fn()}
        />,
      );

      const inviteBtn = screen.getByRole("button", { name: /\+ invite member/i });
      expect(inviteBtn).toBeDefined();

      fireEvent.click(inviteBtn);
      expect(screen.getByRole("heading", { name: /invite team member/i })).toBeDefined();
    });

    it("renders empty state when there are no pending invitations, including invite button", () => {
      render(
        <InvitationsList
          teamId="team_1"
          invitations={[]}
          onInvitationUpdated={vi.fn()}
        />,
      );

      expect(screen.getByText(/no pending invitations/i)).toBeDefined();
      const inviteButtons = screen.getAllByRole("button", { name: /\+ invite member/i });
      expect(inviteButtons.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("InvitationPreviewPage Component", () => {
    it("renders public invitation preview with masked email", async () => {
      vi.spyOn(apiClient, "getInvitationPreview").mockResolvedValue({
        team_name: "VirtuJudge Pitch Team",
        inviter_display_name: "Alex Presenter",
        email_masked: "a***@example.com",
        expires_at: "2026-09-10T12:00:00Z",
        status: "pending",
      });

      renderWithProviders(<InvitationPreviewContent token="test_token_123" />);

      expect(
        await screen.findByText(/join virtujudge pitch team/i),
      ).toBeDefined();
      expect(screen.getByText("Alex Presenter")).toBeDefined();
      expect(screen.getByText("a***@example.com")).toBeDefined();
      expect(
        screen.getByRole("link", { name: /sign in/i }),
      ).toBeDefined();
    });
  });

  describe("InvitationAcceptPage Component", () => {
    beforeEach(() => {
      setClientAuthToken(
        createSyntheticJwt({ email: "alex@example.com", sub: "user_owner" }),
      );
    });

    afterEach(() => {
      removeClientAuthToken();
    });

    it("attempts automatic invitation acceptance for authenticated user", async () => {
      const acceptSpy = vi.spyOn(apiClient, "acceptInvitation").mockResolvedValue({
        team_id: "team_1",
        user_id: "user_owner",
        role: "member",
        display_name: "Alex Presenter",
        joined_at: new Date().toISOString(),
        version: 1,
      });

      renderWithProviders(<InvitationAcceptContent token="test_token_accept" />);

      expect(await screen.findByText(/joining team/i)).toBeDefined();
      await waitFor(() => {
        expect(acceptSpy).toHaveBeenCalledWith("test_token_accept");
      });
    });

    it("displays error message and switch account option on email mismatch", async () => {
      vi.spyOn(apiClient, "acceptInvitation").mockRejectedValue(
        new ApiClientError(409, {
          type: "https://virtujudge.local/errors/conflict",
          title: "Invitation email does not match",
          status: 409,
          detail: "Invitation email does not match the authenticated user",
        }),
      );

      renderWithProviders(<InvitationAcceptContent token="test_token_mismatch" />);

      expect(await screen.findByText(/account mismatch/i)).toBeDefined();
      expect(
        screen.getByRole("button", { name: /sign in with invited account/i }),
      ).toBeDefined();
    });
  });
});
