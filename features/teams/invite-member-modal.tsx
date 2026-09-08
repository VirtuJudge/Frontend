"use client";

import React, { useState } from "react";
import { Button, Input, Text, Wrapper } from "@/components";
import { apiClient } from "@/lib/api/client";
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

  if (!isOpen) return null;

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
      setError(err instanceof Error ? err.message : "Failed to send invitation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-member-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
    >
      <Wrapper
        variant="glass"
        borderGradient="primary"
        className="w-full max-w-md p-6 flex flex-col gap-5 relative animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex justify-between items-center">
          <Text as="h2" size="md" id="invite-member-title" className="font-bold">
            Invite Team Member
          </Text>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="text-foreground/50 hover:text-foreground text-xl font-bold cursor-pointer"
          >
            ×
          </button>
        </div>

        <Text size="sm" className="text-foreground/70">
          Invitations are sent via transactional email and expire in 7 days.
        </Text>

        {error && (
          <div
            role="alert"
            className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colleague@example.com"
            disabled={loading}
            autoFocus
          />

          <div className="flex justify-end gap-3 mt-2">
            <Button
              type="button"
              variant="glass"
              size="sm"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={loading}
            >
              {loading ? "Sending..." : "Send Invitation"}
            </Button>
          </div>
        </form>
      </Wrapper>
    </div>
  );
}
