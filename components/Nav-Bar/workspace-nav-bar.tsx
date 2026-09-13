"use client";

import React, { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Icon } from "@iconify/react";
import { Button, NavDropdown } from "@/components";
import { NavBrand } from "./nav-brand";
import { NAV_CONTAINER_CLASS } from "./nav-config";
import { apiClient } from "@/lib/api/client";
import { CreateTeamModal } from "@/features/teams";
import { CreateProjectModal } from "@/features/projects";
import { Team, Project } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export interface WorkspaceNavBarProps {
  initialProjectId?: string;
  initialTeamId?: string;
  selectedProjectId?: string;
  selectedTeamId?: string;
  onProjectChange?: (projectId: string) => void;
  onTeamChange?: (teamId: string) => void;
  className?: string;
}

export function WorkspaceNavBar({
  initialProjectId,
  initialTeamId,
  selectedProjectId,
  selectedTeamId,
  onProjectChange,
  onTeamChange,
  className,
}: WorkspaceNavBarProps) {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();

  const activeParamProjectId = params?.projectId as string | undefined;
  const projectId = selectedProjectId || initialProjectId || activeParamProjectId;

  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => apiClient.getProject(projectId!),
    enabled: !!projectId,
  });

  // Fetch all user teams
  const { data: teamsPage } = useQuery({
    queryKey: ["teams"],
    queryFn: () => apiClient.getTeams(),
  });

  const teams = teamsPage?.items || [];

  const defaultTeamId = teams[0]?.id;
  const resolvedTeamId =
    selectedTeamId || initialTeamId || project?.team_id || defaultTeamId;

  // Fetch current team
  const { data: currentTeam } = useQuery({
    queryKey: ["team", resolvedTeamId],
    queryFn: () => apiClient.getTeam(resolvedTeamId!),
    enabled: !!resolvedTeamId,
  });

  // Fetch projects for the active team
  const { data: teamProjectsPage } = useQuery({
    queryKey: ["teamProjects", resolvedTeamId],
    queryFn: () => apiClient.getProjects(resolvedTeamId!),
    enabled: !!resolvedTeamId,
  });

  const teamProjects = teamProjectsPage?.items || [];

  const defaultProjectId = teamProjects[0]?.id;
  const resolvedProjectId = projectId || defaultProjectId;

  const currentProject =
    project ||
    (resolvedProjectId
      ? teamProjects.find((p) => p.id === resolvedProjectId)
      : undefined) ||
    teamProjects[0];

  const handleTeamCreated = (newTeam: Team) => {
    queryClient.invalidateQueries({ queryKey: ["teams"] });
    if (onTeamChange) {
      onTeamChange(newTeam.id);
    } else {
      router.push(`/teams/${newTeam.id}`);
    }
  };

  const handleProjectCreated = (newProject: Project) => {
    if (resolvedTeamId) {
      queryClient.invalidateQueries({
        queryKey: ["teamProjects", resolvedTeamId],
      });
    }
    if (onProjectChange) {
      onProjectChange(newProject.id);
    } else {
      router.push(`/projects/${newProject.id}`);
    }
  };

  return (
    <>
      <header className="w-full">
        <div className={cn(NAV_CONTAINER_CLASS, className)}>
          <NavBrand />

          <div className="flex items-center gap-2">
            <Button
              variant="glass"
              borderGradient="nav"
              href="/dashboard"
              aria-label="Go to My Account"
            >
              My account
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 sm:gap-4 w-full mb-6 min-[1200px]:mb-0 min-[1200px]:w-auto min-[1200px]:fixed max-[1200px]:flex-wrap min-[1200px]:top-4 min-[1200px]:left-1/2 min-[1200px]:-translate-x-1/2 min-[1200px]:z-50 min-[1200px]:h-14.25">
          <NavDropdown
            prefix="Team"
            label={currentTeam?.name || teams[0]?.name}
            placeholder="Select a team"
            icon="fluent:people-team-28-regular"
            options={teams.map((t) => ({
              id: t.id,
              label: t.name,
              sublabel: t.role,
              isActive: t.id === resolvedTeamId,
              onClick: () => {
                if (onTeamChange) {
                  onTeamChange(t.id);
                } else if (t.id !== resolvedTeamId) {
                  router.push(`/teams/${t.id}`);
                }
              },
            }))}
            footerAction={{
              label: "New Team",
              icon: "tabler:plus",
              onClick: () => setIsCreateTeamOpen(true),
            }}
            ariaLabel="Current team selector"
          />

          <Icon
            icon="material-symbols:arrow-right-alt-rounded"
            className="text-3xl shrink-0 text-foreground/80 max-[1200px]:hidden"
          />

          <NavDropdown
            prefix="Project"
            label={currentProject?.name || teamProjects[0]?.name}
            placeholder="Select a project"
            icon="material-symbols:folder-managed-outline-sharp"
            disabled={!resolvedTeamId && teamProjects.length === 0}
            options={teamProjects.map((p) => ({
              id: p.id,
              label: p.name,
              isActive: p.id === resolvedProjectId,
              icon: "tabler:presentation",
              onClick: () => {
                if (onProjectChange) {
                  onProjectChange(p.id);
                } else if (p.id !== resolvedProjectId) {
                  router.push(`/projects/${p.id}`);
                }
              },
            }))}
            footerAction={
              resolvedTeamId
                ? {
                    label: "New Project",
                    icon: "tabler:plus",
                    onClick: () => setIsCreateProjectOpen(true),
                  }
                : undefined
            }
            ariaLabel="Current project selector"
          />
        </div>
      </header>

      <CreateTeamModal
        isOpen={isCreateTeamOpen}
        onClose={() => setIsCreateTeamOpen(false)}
        onTeamCreated={handleTeamCreated}
      />

      {resolvedTeamId && (
        <CreateProjectModal
          teamId={resolvedTeamId}
          isOpen={isCreateProjectOpen}
          onClose={() => setIsCreateProjectOpen(false)}
          onProjectCreated={handleProjectCreated}
        />
      )}
    </>
  );
}

// Re-export as ProjectNavBar for backward compatibility
export const ProjectNavBar = WorkspaceNavBar;
export type ProjectNavBarProps = WorkspaceNavBarProps;
