"use client";

import React, { useState } from "react";
import { Input, Modal } from "@/components";
import { apiClient, ApiClientError } from "@/lib/api/client";
import { TeamInvitation } from "@/lib/api/types";

interface InviteMemberModalProps {
  teamId: string;
  isOpen: boolean;
  onClose: () => void;
  onInvitationSent: (invitation: TeamInvitation) => void;
}

export function InviteMemberModal({
  teamId,
  isOpen,
  onClose,
  onInvitationSent,
}: InviteMemberModalProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setError("A valid email address is required");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const idempotencyKey = `invite-${Date.now()}`;
      const invitation = await apiClient.createInvitation(
        teamId,
        normalizedEmail,
        "member",
        idempotencyKey,
      );
      setEmail("");
      onInvitationSent(invitation);
      onClose();
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        if (err.status === 409) {
          if (err.message.includes("already_team_member")) {
            setError("This user is already a member of this team.");
            return;
          }
          if (err.message.includes("invitation_already_exists")) {
            setError("A pending invitation has already been sent to this email.");
            return;
          }
        }
        if (err.status === 403) {
          setError("Only team owners have permission to invite new members.");
          return;
        }
        if (err.status === 429) {
          setError("Invitation rate limit exceeded. Please wait a moment before trying again.");
          return;
        }
        if (err.status === 500) {
          setError("Server error. Please ensure background services (Redis/Database) are running.");
          return;
        }
      }
      setError(
        err instanceof Error ? err.message : "Failed to send invitation",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Invite Team Member"
      titleId="invite-member-title"
      description="Invitations are sent via email and expire in 7 days."
      error={error}
      loading={loading}
      onSubmit={handleSubmit}
      submitText="Send Invitation"
      loadingText="Sending..."
    >
      <Input
        label="Email Address"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="colleague@example.com"
        disabled={loading}
        className="w-full"
      />
    </Modal>
  );
}
