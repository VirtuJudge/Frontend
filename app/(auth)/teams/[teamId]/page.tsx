"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Text, Wrapper } from "@/components";
import { apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth";
import {
  MemberList,
  InvitationsList,
  InviteMemberModal,
} from "@/features/teams";

export function TeamDetailsContent({ teamId }: { teamId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  const { data: team, isLoading: isTeamLoading } = useQuery({
    queryKey: ["team", teamId],
    queryFn: () => apiClient.getTeam(teamId),
  });

  const { data: membersPage, isLoading: isMembersLoading } = useQuery({
    queryKey: ["teamMembers", teamId],
    queryFn: () => apiClient.getTeamMembers(teamId),
  });

  const members = membersPage?.items || [];
  const currentMembership = members.find((m) => m.user_id === user?.id);
  const userRole = currentMembership?.role || team?.role || "member";
  const isOwner = userRole === "owner";

  const { data: invitationsPage } = useQuery({
    queryKey: ["teamInvitations", teamId],
    queryFn: () => apiClient.getTeamInvitations(teamId),
    enabled: isOwner,
  });

  const invitations = invitationsPage?.items || [];

  const handleMemberRemoved = () => {
    queryClient.invalidateQueries({ queryKey: ["teamMembers", teamId] });
    queryClient.invalidateQueries({ queryKey: ["teams"] });
  };

  const handleInvitationUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ["teamInvitations", teamId] });
  };

  if (isTeamLoading || isMembersLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Text size="md">Loading team details...</Text>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Text as="h1" size="lg" className="font-bold">
          Team Not Found
        </Text>
        <Link href="/dashboard" className="text-primary hover:underline">
          ← Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl mx-auto pb-12">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-foreground/60">
        <Link href="/dashboard" className="hover:text-foreground">
          Dashboard
        </Link>
        <span>/</span>
        <span className="text-foreground font-semibold">{team.name}</span>
      </div>

      {/* Team Header */}
      <Wrapper
        variant="glass"
        borderGradient="primary"
        className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <Text as="h1" size="lg" className="font-bold">
              {team.name}
            </Text>
            <span
              className={`text-xs px-2.5 py-1 rounded-full uppercase tracking-wider font-semibold ${
                userRole === "owner"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
              }`}
            >
              {userRole}
            </span>
          </div>
          <Text size="sm" className="text-foreground/70">
            Created on {new Date(team.created_at).toLocaleDateString()}
          </Text>
        </div>

        {isOwner && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsInviteModalOpen(true)}
            className="text-sm"
          >
            + Invite Member
          </Button>
        )}
      </Wrapper>

      {/* Members & Invitations Content */}
      <Wrapper variant="glass" borderGradient="neutral" className="p-6 md:p-8">
        <MemberList
          teamId={teamId}
          members={members}
          currentUserRole={userRole}
          currentUserId={user?.id}
          onMemberRemoved={handleMemberRemoved}
        />

        {isOwner && (
          <InvitationsList
            teamId={teamId}
            invitations={invitations}
            onInvitationUpdated={handleInvitationUpdated}
          />
        )}
      </Wrapper>

      {/* Invite Member Modal */}
      <InviteMemberModal
        teamId={teamId}
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onInvitationSent={handleInvitationUpdated}
      />
    </div>
  );
}

function TeamDetailsWrapper({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = React.use(params);
  return <TeamDetailsContent teamId={teamId} />;
}

export default function TeamDetailsPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  return (
    <React.Suspense
      fallback={
        <div className="flex justify-center items-center min-h-[50vh]">
          <Text size="md">Loading team details...</Text>
        </div>
      }
    >
      <TeamDetailsWrapper params={params} />
    </React.Suspense>
  );
}
