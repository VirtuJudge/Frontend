"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Icon } from "@iconify/react";
import {
  Wrapper,
  Text,
  Button,
  BreadcrumbNav,
  ListRowCard,
  PillBadge,
  RoleBadge,
  ActionAddButton,
  ActionIconButton,
  ProjectAssetsCountBadge,
} from "@/components";
import { apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth";
import LoadingPage from "@/app/loading";
import NotFoundPage from "@/app/not-found";

import { InviteMemberModal as LocalInviteMemberModal } from "./invite-member-modal";
import { ManageMemberModal as LocalManageMemberModal } from "./manage-member-modal";
import { ManageInvitationModal as LocalManageInvitationModal } from "./manage-invitation-modal";
import { CreateProjectModal, DeleteProjectModal } from "@/features/projects";
import { Project, TeamMembership, TeamInvitation } from "@/lib/api/types";

export function TeamDashboard({ teamId }: { teamId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Modals state
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isInviteMemberOpen, setIsInviteMemberOpen] = useState(false);
  const [manageMember, setManageMember] = useState<TeamMembership | null>(null);
  const [memberManageView, setMemberManageView] = useState<
    "remove" | "transfer"
  >("remove");
  const [manageInvitation, setManageInvitation] =
    useState<TeamInvitation | null>(null);

  const { data: team, isLoading: isTeamLoading } = useQuery({
    queryKey: ["team", teamId],
    queryFn: () => apiClient.getTeam(teamId),
  });

  const {
    data: membersData,
    isLoading: isMembersLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["teamMembers", teamId],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      apiClient.getTeamMembers(teamId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.next_cursor || undefined,
  });

  const { data: projectsPage, isLoading: isProjectsLoading } = useQuery({
    queryKey: ["teamProjects", teamId],
    queryFn: () => apiClient.getProjects(teamId),
  });

  const members = useMemo(() => {
    if (!membersData) return [];
    const seen = new Set<string>();
    const list: TeamMembership[] = [];
    for (const page of membersData.pages) {
      for (const item of page.items) {
        if (!seen.has(item.user_id)) {
          seen.add(item.user_id);
          list.push(item);
        }
      }
    }
    return list;
  }, [membersData]);

  // Determine user's role independently of whichever page is visible
  const currentMembershipInView = members.find((m) => m.user_id === user?.id);

  const { data: resolvedUserRole } = useQuery({
    queryKey: ["teamUserRole", teamId, user?.id],
    queryFn: async (): Promise<"owner" | "member"> => {
      if (!user?.id) return "member";
      if (team?.role) return team.role;
      let cursor: string | undefined = undefined;
      while (true) {
        const page = await apiClient.getTeamMembers(teamId, cursor);
        const match = page.items.find((m) => m.user_id === user.id);
        if (match) return match.role;
        if (!page.next_cursor || !page.has_more) break;
        cursor = page.next_cursor;
      }
      return "member";
    },
    enabled: !!teamId && !!user?.id && !currentMembershipInView,
  });

  const projects = projectsPage?.items || [];
  const userRole =
    currentMembershipInView?.role || resolvedUserRole || team?.role || "member";
  const isOwner = userRole === "owner";

  const { data: invitationsPage } = useQuery({
    queryKey: ["teamInvitations", teamId],
    queryFn: () => apiClient.getTeamInvitations(teamId),
    enabled: isOwner,
  });

  const invitations = invitationsPage?.items || [];

  const handleMemberRemoved = () => {
    queryClient.invalidateQueries({ queryKey: ["teamMembers", teamId] });
    queryClient.invalidateQueries({ queryKey: ["teamUserRole", teamId, user?.id] });
    queryClient.invalidateQueries({ queryKey: ["team", teamId] });
    queryClient.invalidateQueries({ queryKey: ["teams"] });
  };

  const handleOwnershipTransferred = () => {
    queryClient.invalidateQueries({ queryKey: ["team", teamId] });
    queryClient.invalidateQueries({ queryKey: ["teamMembers", teamId] });
    queryClient.invalidateQueries({ queryKey: ["teamUserRole", teamId, user?.id] });
    queryClient.invalidateQueries({ queryKey: ["teams"] });
    queryClient.invalidateQueries({ queryKey: ["teamInvitations", teamId] });
  };

  const handleInvitationUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ["teamInvitations", teamId] });
  };

  const handleProjectCreated = () => {
    queryClient.invalidateQueries({ queryKey: ["teamProjects", teamId] });
  };

  if (isTeamLoading || isMembersLoading || isProjectsLoading) {
    return <LoadingPage />;
  }

  if (!team) {
    return <NotFoundPage />;
  }

  return (
    <div className="flex flex-col items-center justify-center w-full pb-20 gap-10">
      {/* Top Breadcrumbs Pill */}
      <BreadcrumbNav
        backHref="/teams"
        parentLabel="Teams"
        currentLabel={team.name}
      />

      <div className="w-full max-w-4xl flex flex-col gap-24">
        {/* ================= Projects Section ================= */}
        <div className="flex flex-col items-center w-full gap-8">
          <Text className="text-3xl font-bold text-fg-light">Projects</Text>

          <div className="w-full flex flex-col gap-4">
            {projects.length === 0 ? (
              <Wrapper className="rounded-full py-6 text-center text-foreground/60 ">
                No projects yet
              </Wrapper>
            ) : (
              projects.map((project: Project) => (
                <ListRowCard key={project.id}>
                  {/* Left: Project name and link arrow */}
                  <div className="flex items-center gap-3 pl-3 min-w-0">
                    <Text className="font-bold">{project.name}</Text>
                    <Link
                      href={`/projects/${project.id}`}
                      className="text-foreground/70 hover:text-primary transition-colors flex items-center p-1 shrink-0"
                      aria-label={`Open project ${project.name}`}
                    >
                      <Icon
                        icon="solar:arrow-right-up-linear"
                        className="text-2xl font-bold"
                      />
                    </Link>
                  </div>

                  {/* Right: Trash icon and Assets badge */}
                  <div className="flex items-center gap-3 shrink-0">
                    {isOwner && (
                      <ActionIconButton
                        icon="solar:trash-bin-trash-linear"
                        variant="danger"
                        onClick={() => setProjectToDelete(project)}
                        ariaLabel={`Delete project ${project.name}`}
                        title="Delete project"
                      />
                    )}

                    <ProjectAssetsCountBadge projectId={project.id} />
                  </div>
                </ListRowCard>
              ))
            )}
          </div>

          {/* Plus button to create project */}
          <div className="flex justify-center">
            <ActionAddButton
              onClick={() => setIsCreateProjectOpen(true)}
              ariaLabel="Create new project"
              title="Create new project"
            />
          </div>
        </div>

        {/* ================= Members Section ================= */}
        <div className="flex flex-col items-center w-full gap-8">
          <Text className="text-3xl font-bold text-fg-light">Members</Text>

          <div className="w-full flex flex-col gap-4">
            {members.map((member: TeamMembership) => {
              const isCurrentUser = member.user_id === user?.id;
              const memberDisplayName =
                member.display_name?.trim() || "Team Member";
              const memberEmail = isCurrentUser && user?.email ? user.email : null;

              return (
                <ListRowCard key={member.user_id}>
                  {/* Left: Name and Email */}
                  <div className="flex flex-col text-left pl-3 min-w-0">
                    <div className="flex items-center gap-2">
                      <Text className="font-bold">{memberDisplayName}</Text>
                      {isCurrentUser && (
                        <span className="text-foreground/70 text-base font-normal ">
                          (you)
                        </span>
                      )}
                    </div>
                    {memberEmail && (
                      <span className="text-xs text-foreground/60 truncate">
                        {memberEmail}
                      </span>
                    )}
                  </div>

                  {/* Right: Owner badge or Crown / Trash */}
                  <div className="flex items-center justify-center gap-3 shrink-0 pr-1">
                    {member.role === "owner" ? (
                      <div className="h-full">
                        <RoleBadge role="Owner" />
                      </div>
                    ) : isOwner ? (
                      <>
                        <ActionIconButton
                          icon="solar:crown-linear"
                          variant="primary"
                          onClick={() => {
                            setManageMember(member);
                            setMemberManageView("transfer");
                          }}
                          ariaLabel={`Transfer ownership to ${memberDisplayName}`}
                          title="Transfer ownership"
                        />

                        <ActionIconButton
                          icon="solar:trash-bin-trash-linear"
                          variant="danger"
                          onClick={() => {
                            setManageMember(member);
                            setMemberManageView("remove");
                          }}
                          ariaLabel={`Remove ${memberDisplayName}`}
                          title="Remove member"
                        />
                      </>
                    ) : null}
                  </div>
                </ListRowCard>
              );
            })}
          </div>

          {hasNextPage && (
            <div className="flex justify-center mt-2">
              <Button
                variant="glass"
                size="sm"
                onClick={() => fetchNextPage()}
                loading={isFetchingNextPage}
                className="rounded-full px-6 py-2 text-sm"
              >
                Load more members
              </Button>
            </div>
          )}

          {/* Plus button to invite member */}
          {isOwner && (
            <div className="flex justify-center">
              <ActionAddButton
                onClick={() => setIsInviteMemberOpen(true)}
                ariaLabel="Invite member"
                title="Invite member"
              />
            </div>
          )}
        </div>

        {/* ================= Invitations Section ================= */}
        {isOwner && (
          <div className="flex flex-col items-center w-full gap-8">
            <Text className="text-3xl font-bold text-fg-light">
              Invitations
            </Text>

            <div className="w-full flex flex-col gap-4">
              {invitations.length === 0 ? (
                <Wrapper className="rounded-full py-6 text-center text-foreground/60 ">
                  No invitations pending
                </Wrapper>
              ) : (
                invitations.map((invitation: TeamInvitation) => (
                  <ListRowCard key={invitation.id}>
                    {/* Left: Invited Email and Sent Date */}
                    <div className="flex flex-col text-left pl-3 min-w-0">
                      <Text className="text-base sm:text-lg text-fg truncate font-bold">
                        {invitation.email}
                      </Text>
                      {invitation.created_at && (
                        <Text
                          size="xs"
                          className="text-foreground/60 truncate text-left"
                          suppressHydrationWarning
                        >
                          sent at:{" "}
                          {new Date(invitation.created_at).toLocaleDateString()}{" "}
                          {new Date(invitation.created_at).toLocaleTimeString(
                            [],
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </Text>
                      )}
                    </div>

                    {/* Right: Actions and Status badge */}
                    <div className="flex items-center gap-3 shrink-0">
                      {invitation.status === "pending" && (
                        <>
                          <ActionIconButton
                            icon="tabler:settings"
                            variant="primary"
                            onClick={() => setManageInvitation(invitation)}
                            ariaLabel={`Manage invitation of: ${invitation.email}`}
                            title={`Manage invitation of: ${invitation.email}`}
                          />

                          <PillBadge icon="solar:hourglass-line-linear">
                            Pending
                          </PillBadge>
                        </>
                      )}

                      {invitation.status === "accepted" && (
                        <PillBadge icon="solar:letter-opened-linear">
                          Accepted
                        </PillBadge>
                      )}

                      {(invitation.status === "revoked" ||
                        invitation.status === "expired") && (
                        <PillBadge
                          icon="solar:forbidden-circle-linear"
                          iconClassName="text-2xl text-foreground/60"
                        >
                          Cancelled
                        </PillBadge>
                      )}
                    </div>
                  </ListRowCard>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateProjectModal
        teamId={teamId}
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
        onProjectCreated={handleProjectCreated}
      />

      <LocalInviteMemberModal
        teamId={teamId}
        isOpen={isInviteMemberOpen}
        onClose={() => setIsInviteMemberOpen(false)}
        onInvitationSent={handleInvitationUpdated}
      />

      <LocalManageMemberModal
        teamId={teamId}
        teamName={team.name}
        member={manageMember}
        isOpen={!!manageMember}
        initialView={memberManageView}
        onClose={() => setManageMember(null)}
        onMemberRemoved={() => {
          handleMemberRemoved();
          setManageMember(null);
        }}
        onOwnershipTransferred={() => {
          handleOwnershipTransferred();
          setManageMember(null);
        }}
      />

      <LocalManageInvitationModal
        teamId={teamId}
        teamName={team.name}
        invitation={manageInvitation}
        isOpen={!!manageInvitation}
        onClose={() => setManageInvitation(null)}
        onInvitationUpdated={() => {
          handleInvitationUpdated();
          setManageInvitation(null);
        }}
      />

      <DeleteProjectModal
        project={projectToDelete}
        isOpen={!!projectToDelete}
        onClose={() => setProjectToDelete(null)}
        onProjectDeleted={() => {
          queryClient.invalidateQueries({ queryKey: ["teamProjects", teamId] });
          setProjectToDelete(null);
        }}
      />
    </div>
  );
}
