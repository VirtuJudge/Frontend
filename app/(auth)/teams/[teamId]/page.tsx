"use client";

import React from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Text, Wrapper } from "@/components";
import { apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth";
import LoadingPage from "@/app/loading";
import NotFoundPage from "@/app/not-found";
import { InvitationsList, MemberList } from "@/features/teams";
import { ProjectList } from "@/features/projects";

export function TeamDetailsContent({ teamId }: { teamId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: team, isLoading: isTeamLoading } = useQuery({
    queryKey: ["team", teamId],
    queryFn: () => apiClient.getTeam(teamId),
  });

  const { data: membersPage, isLoading: isMembersLoading } = useQuery({
    queryKey: ["teamMembers", teamId],
    queryFn: () => apiClient.getTeamMembers(teamId),
  });

  const { data: projectsPage, isLoading: isProjectsLoading } = useQuery({
    queryKey: ["teamProjects", teamId],
    queryFn: () => apiClient.getProjects(teamId),
  });

  const projects = projectsPage?.items || [];

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

  const handleOwnershipTransferred = () => {
    queryClient.invalidateQueries({ queryKey: ["team", teamId] });
    queryClient.invalidateQueries({ queryKey: ["teamMembers", teamId] });
    queryClient.invalidateQueries({ queryKey: ["teams"] });
    queryClient.invalidateQueries({ queryKey: ["teamInvitations", teamId] });
  };

  const handleInvitationUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ["teamInvitations", teamId] });
  };

  const handleProjectCreated = () => {
    queryClient.invalidateQueries({ queryKey: ["teamProjects", teamId] });
  };

  if (isTeamLoading || isMembersLoading) {
    return <LoadingPage />;
  }

  if (!team) {
    return <NotFoundPage />;
  }

  return (
    <div className="flex flex-col gap-10 pb-12">
      <Text className="flex gap-2 text-left pl-2">
        <Link href="/dashboard" className="text-primary">
          ← Back to Dashboard
        </Link>
      </Text>

      <div className="flex flex-col gap-1 w-fit mx-auto">
        <Text as="h1" size="lg" className="font-bold">
          {team.name}
        </Text>

        <div className="flex items-center gap-2 flex-wrap justify-between">
          <Text size="sm" className="text-foreground/70">
            Created on {new Date(team.created_at).toLocaleDateString()}
          </Text>
          <span
            className={`px-2.5 py-1 w-fit rounded-full uppercase font-semibold ${
              userRole === "owner"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "bg-primary/20 text-primary border border-primary/30"
            }`}
          >
            {userRole}
          </span>
        </div>
      </div>

      {isProjectsLoading ? (
        <Wrapper
          variant="glass"
          borderGradient="neutral"
          className="p-8 text-center"
        >
          <Text size="sm" className="text-foreground/70">
            Loading projects...
          </Text>
        </Wrapper>
      ) : (
        <ProjectList
          teamId={teamId}
          teamName={team.name}
          projects={projects}
          onProjectCreated={handleProjectCreated}
        />
      )}

      <MemberList
        teamId={teamId}
        teamName={team.name}
        members={members}
        currentUserRole={userRole}
        currentUserId={user?.id}
        onMemberRemoved={handleMemberRemoved}
        onOwnershipTransferred={handleOwnershipTransferred}
      />

      {isOwner && (
        <InvitationsList
          teamId={teamId}
          invitations={invitations}
          onInvitationUpdated={handleInvitationUpdated}
          isOwner={isOwner}
        />
      )}
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
    <React.Suspense fallback={<LoadingPage />}>
      <TeamDetailsWrapper params={params} />
    </React.Suspense>
  );
}
