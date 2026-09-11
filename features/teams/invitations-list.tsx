"use client";

import React, { useState } from "react";
import { Button, Text, Wrapper } from "@/components";
import { TeamInvitation, DeliveryStatus } from "@/lib/api/types";
import { ManageInvitationModal } from "./manage-invitation-modal";
import { InviteMemberModal } from "./invite-member-modal";

interface InvitationsListProps {
  teamId: string;
  invitations: TeamInvitation[];
  onInvitationUpdated: () => void;
  isOwner?: boolean;
}

export function InvitationsList({
  teamId,
  invitations,
  onInvitationUpdated,
  isOwner = true,
}: InvitationsListProps) {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedManageInvitation, setSelectedManageInvitation] =
    useState<TeamInvitation | null>(null);
  const [error] = useState<string | null>(null);

  const pendingInvitations = invitations.filter((i) => i.status === "pending");

  const renderDeliveryBadge = (status: DeliveryStatus, attempts: number) => {
    switch (status) {
      case "accepted_by_gmail":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Sent successfully
          </span>
        );
      case "queued":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Dispatching via mail server...
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-danger/20 text-danger-lighter border border-danger/30">
            <span className="w-1.5 h-1.5 rounded-full bg-danger" />
            Delivery failed ({attempts} attempt{attempts === 1 ? "" : "s"})
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center gap-4">
        <div className="pl-2">
          <Text as="h2" size="md" className="font-bold text-left">
            Pending Invitations
          </Text>
          <Text size="sm" className="text-left">
            Outstanding invitations sent to prospective team members.
          </Text>
        </div>
        {isOwner && pendingInvitations.length > 0 && (
          <Button
            variant="glass"
            size="sm"
            onClick={() => setIsInviteModalOpen(true)}
            className="text-sm"
          >
            + Invite Member
          </Button>
        )}
      </div>

      {pendingInvitations.length === 0 ? (
        <Wrapper
          variant="glass"
          borderGradient="neutral"
          className="p-8 text-center flex flex-col items-center gap-3"
        >
          <Text size="md" className="font-semibold">
            No pending invitations
          </Text>
          <Text size="sm">
            Invite colleagues to join your team and collaborate on pitch
            projects.
          </Text>
          {isOwner && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsInviteModalOpen(true)}
            >
              + Invite Member
            </Button>
          )}
        </Wrapper>
      ) : (
        <Wrapper
          variant="glass"
          borderGradient="neutral"
          className="p-6 pb-2 md:p-8 md:pb-4 rounded-2xl flex flex-col gap-6"
        >
          {error && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger-lighter text-sm"
            >
              {error}
            </div>
          )}

          <div className="overflow-x-auto gap-9">
            <table
              className="w-full text-center"
              aria-label="Pending invitations list"
            >
              <thead>
                <tr className="border-b border-primary/20 font-bold text-lg">
                  <th className="pb-4 text-left px-2">Recipient Email</th>
                  <th className="pb-4">Role</th>
                  <th className="pb-4">Delivery Status</th>
                  <th className="pb-4">Expires on</th>
                  <th className="pb-4 text-right px-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/20">
                {pendingInvitations.map((inv) => (
                  <tr key={inv.id}>
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-left">
                          {inv.email}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <span className="px-2.5 py-1 rounded-full uppercase tracking-wider font-semibold bg-primary/20 text-primary border border-primary/30">
                        {inv.role}
                      </span>
                    </td>
                    <td className="py-4 px-2">
                      {renderDeliveryBadge(
                        inv.delivery_status,
                        inv.delivery_attempts,
                      )}
                    </td>
                    <td className="py-4 px-2">
                      {new Date(inv.expires_at).toLocaleDateString()}{" "}
                      {new Date(inv.expires_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-4 px-2 text-right">
                      <Button
                        size="sm"
                        onClick={() => setSelectedManageInvitation(inv)}
                      >
                        Manage
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Wrapper>
      )}

      <InviteMemberModal
        teamId={teamId}
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onInvitationSent={() => {
          onInvitationUpdated?.();
        }}
      />

      <ManageInvitationModal
        teamId={teamId}
        invitation={selectedManageInvitation}
        isOpen={selectedManageInvitation !== null}
        onClose={() => setSelectedManageInvitation(null)}
        onInvitationUpdated={() => {
          onInvitationUpdated();
          setSelectedManageInvitation(null);
        }}
      />
    </div>
  );
}
