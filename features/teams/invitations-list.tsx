"use client";

import React, { useState } from "react";
import { Text } from "@/components";
import { TeamInvitation, DeliveryStatus } from "@/lib/api/types";
import { apiClient } from "@/lib/api/client";

interface InvitationsListProps {
  teamId: string;
  invitations: TeamInvitation[];
  onInvitationUpdated: () => void;
}

export function InvitationsList({
  teamId,
  invitations,
  onInvitationUpdated,
}: InvitationsListProps) {
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const pendingInvitations = invitations.filter((i) => i.status === "pending");

  const handleResend = async (invitationId: string) => {
    try {
      setActionLoadingId(invitationId);
      setError(null);
      const idempotencyKey = `resend-${Date.now()}`;
      await apiClient.resendInvitation(teamId, invitationId, idempotencyKey);
      onInvitationUpdated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to resend invitation");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRevoke = async (invitationId: string) => {
    try {
      setActionLoadingId(invitationId);
      setError(null);
      await apiClient.revokeInvitation(teamId, invitationId);
      onInvitationUpdated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to revoke invitation");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCopyLink = (invitationId: string) => {
    const inviteUrl = `${window.location.origin}/invitations/${invitationId}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedId(invitationId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderDeliveryBadge = (status: DeliveryStatus, attempts: number) => {
    switch (status) {
      case "accepted_by_gmail":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Sent successfully
          </span>
        );
      case "queued":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Dispatching via mail server...
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            Delivery failed ({attempts} attempt{attempts === 1 ? "" : "s"})
          </span>
        );
      default:
        return null;
    }
  };

  if (pendingInvitations.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 mt-6 pt-6 border-t border-foreground/10">
      <div>
        <Text as="h3" size="md" className="font-bold">
          Pending Invitations ({pendingInvitations.length})
        </Text>
        <Text size="sm" className="text-foreground/70">
          Outstanding invitations sent to prospective team members
        </Text>
      </div>

      {error && (
        <div
          role="alert"
          className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
        >
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table
          className="w-full text-left text-sm"
          aria-label="Pending invitations list"
        >
          <thead>
            <tr className="border-b border-foreground/10 text-foreground/50">
              <th className="pb-3 font-semibold">Recipient</th>
              <th className="pb-3 font-semibold">Delivery Status</th>
              <th className="pb-3 font-semibold">Expires</th>
              <th className="pb-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/5">
            {pendingInvitations.map((inv) => {
              const isLoading = actionLoadingId === inv.id;

              return (
                <tr key={inv.id} className="hover:bg-foreground/5">
                  <td className="py-4">
                    <span className="font-semibold text-foreground">
                      {inv.email}
                    </span>
                  </td>
                  <td className="py-4">
                    {renderDeliveryBadge(inv.delivery_status, inv.delivery_attempts)}
                  </td>
                  <td className="py-4 text-foreground/60 text-xs">
                    {new Date(inv.expires_at).toLocaleDateString()}
                  </td>
                  <td className="py-4 text-right">
                    <div className="inline-flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleCopyLink(inv.id)}
                        className="text-xs text-primary hover:underline font-medium cursor-pointer"
                      >
                        {copiedId === inv.id ? "Copied!" : "Copy Link"}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleResend(inv.id)}
                        disabled={isLoading}
                        className="text-xs text-foreground/70 hover:text-foreground font-medium cursor-pointer disabled:opacity-50"
                      >
                        {isLoading ? "Processing..." : "Resend"}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRevoke(inv.id)}
                        disabled={isLoading}
                        className="text-xs text-red-400 hover:text-red-300 font-medium cursor-pointer disabled:opacity-50"
                      >
                        Revoke
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
