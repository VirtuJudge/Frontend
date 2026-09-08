"use client";

import React, { useState } from "react";
import { Text } from "@/components";
import { TeamMembership, TeamRole } from "@/lib/api/types";
import { apiClient } from "@/lib/api/client";

interface MemberListProps {
  teamId: string;
  members: TeamMembership[];
  currentUserRole: TeamRole;
  currentUserId?: string;
  onMemberRemoved: (userId: string) => void;
}

export function MemberList({
  teamId,
  members,
  currentUserRole,
  currentUserId,
  onMemberRemoved,
}: MemberListProps) {
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [confirmingUserId, setConfirmingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isOwner = currentUserRole === "owner";
  const ownerCount = members.filter((m) => m.role === "owner").length;

  const handleRemove = async (userId: string) => {
    try {
      setRemovingUserId(userId);
      setError(null);
      await apiClient.removeTeamMember(teamId, userId);
      onMemberRemoved(userId);
      setConfirmingUserId(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setRemovingUserId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Text as="h3" size="md" className="font-bold">
          Team Members ({members.length})
        </Text>
        <Text size="sm" className="text-foreground/70">
          Presenters and collaborators with access to this team
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
          aria-label="Team members list"
        >
          <thead>
            <tr className="border-b border-foreground/10 text-foreground/50">
              <th className="pb-3 font-semibold">Member</th>
              <th className="pb-3 font-semibold">Role</th>
              <th className="pb-3 font-semibold">Joined</th>
              {isOwner && <th className="pb-3 font-semibold text-right">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/5">
            {members.map((member) => {
              const isCurrentUser = member.user_id === currentUserId;
              const isOnlyOwner = member.role === "owner" && ownerCount <= 1;

              return (
                <tr key={member.user_id} className="hover:bg-foreground/5">
                  <td className="py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {member.display_name}
                      </span>
                      {isCurrentUser && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-md">
                          You
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-4">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full uppercase tracking-wider font-semibold ${
                        member.role === "owner"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                      }`}
                    >
                      {member.role}
                    </span>
                  </td>
                  <td className="py-4 text-foreground/60">
                    {new Date(member.joined_at).toLocaleDateString()}
                  </td>
                  {isOwner && (
                    <td className="py-4 text-right">
                      {isOnlyOwner ? (
                        <span
                          className="text-xs text-foreground/40 italic"
                          title="The final owner cannot be removed"
                        >
                          Primary Owner
                        </span>
                      ) : confirmingUserId === member.user_id ? (
                        <div className="inline-flex items-center gap-2">
                          <span className="text-xs text-red-400">Confirm?</span>
                          <button
                            type="button"
                            onClick={() => handleRemove(member.user_id)}
                            disabled={removingUserId === member.user_id}
                            className="text-xs text-red-400 font-bold hover:underline cursor-pointer"
                          >
                            {removingUserId === member.user_id ? "Removing..." : "Yes, Remove"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingUserId(null)}
                            className="text-xs text-foreground/50 hover:underline cursor-pointer ml-1"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmingUserId(member.user_id)}
                          className="text-xs text-red-400/80 hover:text-red-400 font-medium cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
