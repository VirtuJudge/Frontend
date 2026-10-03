import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InvitationsList } from "@/features/teams/invitations-list";
import type { DeliveryStatus, TeamInvitation } from "@/lib/api/types";

vi.mock("@/features/teams/invite-member-modal", () => ({
  InviteMemberModal: () => null,
}));
vi.mock("@/features/teams/manage-invitation-modal", () => ({
  ManageInvitationModal: () => null,
}));

describe("invitation delivery status rollout", () => {
  it.each<DeliveryStatus>(["accepted_by_provider", "accepted_by_gmail"])(
    "shows successful submission for %s",
    (deliveryStatus) => {
      const invitation: TeamInvitation = {
        id: "invitation-1",
        team_id: "team-1",
        email: "invitee@example.com",
        role: "member",
        status: "pending",
        delivery_status: deliveryStatus,
        delivery_attempts: 1,
        created_at: "2026-10-03T10:00:00Z",
        expires_at: "2026-10-04T10:00:00Z",
      };
      render(
        <InvitationsList
          teamId="team-1"
          teamName="Team"
          invitations={[invitation]}
          onInvitationUpdated={vi.fn()}
        />,
      );
      expect(screen.getByText("Sent successfully")).toBeTruthy();
      expect(screen.queryByText(/accepted_by_/)).toBeNull();
    },
  );
});
