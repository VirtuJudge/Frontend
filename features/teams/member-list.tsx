"use client";

import React, { useState } from "react";
import { Button, Text, Wrapper } from "@/components";
import { TeamMembership, TeamInvitation, TeamRole } from "@/lib/api/types";
import { InvitationsList } from "./invitations-list";
import { InviteMemberModal } from "./invite-member-modal";
import { ManageMemberModal } from "./manage-member-modal";

interface MemberListProps {
  teamId: string;
  teamName?: string;
  members: TeamMembership[];
  currentUserRole: TeamRole;
  currentUserId?: string;
  invitations?: TeamInvitation[];
  onMemberRemoved: (userId: string) => void;
  onInvitationUpdated?: () => void;
  onOwnershipTransferred?: (newOwnerUserId: string) => void;
}

export function MemberList({
  teamId,
  teamName,
  members,
  currentUserRole,
  currentUserId,
  invitations,
  onMemberRemoved,
  onInvitationUpdated,
  onOwnershipTransferred,
}: MemberListProps) {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedManageMember, setSelectedManageMember] =
    useState<TeamMembership | null>(null);
  const [error] = useState<string | null>(null);

  const isOwner = currentUserRole === "owner";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center gap-4">
        <div className="pl-2">
          <Text as="h2" size="md" className="font-bold text-left">
            Team Members
          </Text>
          <Text size="sm" className="text-left">
            Members have access to this team and its projects.
          </Text>
        </div>
        {isOwner && (
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
          <table className="w-full text-center" aria-label="Team members list">
            <thead>
              <tr className="border-b border-primary/20 font-bold text-lg">
                <th className="pb-4 text-left px-2">Member Name</th>
                <th className="pb-4">Role</th>
                <th
                  className={`pb-4 ${!isOwner && "text-right px-2"}`}
                >
                  Joined at
                </th>
                {isOwner && (
                  <th className="pb-4 text-right px-2">Action</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/20">
              {members.map((member) => {
                const isCurrentUser = member.user_id === currentUserId;

                return (
                  <tr key={member.user_id}>
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-left">
                          {member.display_name}
                        </span>
                        {isCurrentUser && (
                          <span className="py-0.5 rounded-md italic">
                            (You)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <span
                        className={` px-2.5 py-1 rounded-full uppercase tracking-wider font-semibold ${
                          member.role === "owner"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : "bg-primary/20 text-primary border border-primary/30"
                        }`}
                      >
                        {member.role}
                      </span>
                    </td>
                    <td className={`py-4 px-2 ${!isOwner && "text-right"}`}>
                      {new Date(member.joined_at).toLocaleDateString()}
                    </td>
                    {isOwner && (
                      <td className="py-4 px-2 text-right">
                        {member.role === "owner" ? (
                          <span
                            className="font-bold italic cursor-not-allowed"
                            title="The owner cannot be removed"
                          >
                            Team Owner
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => setSelectedManageMember(member)}
                          >
                            Manage
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {isOwner && invitations && (
          <InvitationsList
            teamId={teamId}
            invitations={invitations}
            onInvitationUpdated={onInvitationUpdated || (() => {})}
          />
        )}
      </Wrapper>

      <InviteMemberModal
        teamId={teamId}
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onInvitationSent={() => {
          onInvitationUpdated?.();
        }}
      />

      <ManageMemberModal
        teamId={teamId}
        teamName={teamName}
        member={selectedManageMember}
        isOpen={selectedManageMember !== null}
        onClose={() => setSelectedManageMember(null)}
        onMemberRemoved={(userId) => {
          onMemberRemoved(userId);
          setSelectedManageMember(null);
        }}
        onOwnershipTransferred={(newOwnerId) => {
          onOwnershipTransferred?.(newOwnerId);
          setSelectedManageMember(null);
        }}
      />
    </div>
  );
}
