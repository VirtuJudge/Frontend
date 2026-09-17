"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components";
import { WorkspaceNavBar } from "@/components/Nav-Bar";
import { useAuth } from "@/features/auth";
import { apiClient, ApiClientError } from "@/lib/api/client";
import type { Team, Project } from "@/lib/api/types";
import { Text } from "@/components/text";

const inFlightWorkspaceCreations = new Map<
  string,
  Promise<{ team: Team; project: Project } | null>
>();

export default function RootPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: teamsPage } = useQuery({
    queryKey: ["teams"],
    queryFn: () => apiClient.getTeams(),
  });
  const teams = teamsPage?.items || [];

  const [selectedTeamId, setSelectedTeamId] = useState<string | undefined>(
    undefined,
  );
  const activeTeamId = selectedTeamId || teams[0]?.id;

  const { data: teamProjectsPage } = useQuery({
    queryKey: ["teamProjects", activeTeamId],
    queryFn: () => apiClient.getProjects(activeTeamId!),
    enabled: !!activeTeamId,
  });
  const teamProjects = teamProjectsPage?.items || [];

  const [selectedProjectId, setSelectedProjectId] = useState<
    string | undefined
  >(undefined);
  const activeProjectId = selectedProjectId || teamProjects[0]?.id;

  useEffect(() => {
    if (!user || !teamsPage) return;

    if (teams.length === 0) {
      const userId = user.id;
      const teamName = `${user.display_name}'s Team`;
      const idempotencyKeyTeam = `team-default-${userId}`;
      const idempotencyKeyProj = `proj-default-${userId}`;

      let initPromise = inFlightWorkspaceCreations.get(userId);
      if (!initPromise) {
        initPromise = (async () => {
          try {
            let newTeam: Team | null = null;
            try {
              newTeam = await apiClient.createTeam(
                teamName,
                idempotencyKeyTeam,
              );
            } catch (err: unknown) {
              const isConflict =
                (err instanceof ApiClientError && err.status === 409) ||
                (err instanceof Error && err.message.includes("409"));

              if (isConflict) {
                const refreshed = await apiClient.getTeams();
                if (refreshed?.items && refreshed.items.length > 0) {
                  newTeam =
                    refreshed.items.find((t) => t.name === teamName) ||
                    refreshed.items[0];
                } else {
                  const fallbackName = `${teamName} (${userId.slice(0, 4)})`;
                  newTeam = await apiClient.createTeam(
                    fallbackName,
                    `${idempotencyKeyTeam}-fallback`,
                  );
                }
              } else {
                throw err;
              }
            }

            if (!newTeam) {
              return null;
            }

            let newProject: Project | null = null;
            try {
              newProject = await apiClient.createProject(
                newTeam.id,
                { name: "Project 1" },
                idempotencyKeyProj,
              );
            } catch (projErr: unknown) {
              const isConflict =
                (projErr instanceof ApiClientError && projErr.status === 409) ||
                (projErr instanceof Error && projErr.message.includes("409"));

              if (isConflict) {
                const projList = await apiClient.getProjects(newTeam.id);
                if (projList?.items && projList.items.length > 0) {
                  newProject =
                    projList.items.find((p) => p.name === "Project 1") ||
                    projList.items[0];
                }
              }
              if (!newProject) {
                throw projErr;
              }
            }

            return { team: newTeam, project: newProject };
          } catch (err) {
            console.warn(
              "Failed to create default team and project on RootPage:",
              err,
            );
            return null;
          } finally {
            inFlightWorkspaceCreations.delete(userId);
          }
        })();

        inFlightWorkspaceCreations.set(userId, initPromise);
      }

      initPromise.then((result) => {
        if (!result) return;
        const { team: newTeam, project: newProject } = result;

        setSelectedTeamId(newTeam.id);
        setSelectedProjectId(newProject.id);

        queryClient.setQueryData(["teams"], {
          items: [newTeam],
          has_more: false,
        });
        queryClient.setQueryData(["teamProjects", newTeam.id], {
          items: [newProject],
          has_more: false,
        });

        queryClient.invalidateQueries({ queryKey: ["teams"] });
        queryClient.invalidateQueries({
          queryKey: ["teamProjects", newTeam.id],
        });
      });
    }
  }, [user, teamsPage, teams.length, queryClient]);

  const startHref = activeProjectId
    ? `/projects/${activeProjectId}/session/prepare`
    : "/teams";

  const historyHref = activeProjectId
    ? `/projects/${activeProjectId}#sessions`
    : "/projects";

  const displayName =
    user?.display_name?.trim() ||
    (user?.email ? user.email.split("@")[0] : "") ||
    "Presenter";

  return (
    <div className="flex flex-col justify-center items-center h-[calc(100vh-200px)] pt-60 w-full relative">
      <WorkspaceNavBar
        selectedTeamId={activeTeamId}
        selectedProjectId={activeProjectId}
        onTeamChange={(newTeamId) => {
          setSelectedTeamId(newTeamId);
          setSelectedProjectId(undefined);
        }}
        onProjectChange={(newProjectId) => {
          setSelectedProjectId(newProjectId);
        }}
      />

      <main className="flex flex-col items-center justify-center text-center w-full h-full z-10">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-fg">
          {new Date().getHours() < 12
            ? "Good morning"
            : new Date().getHours() < 18
              ? "Good afternoon"
              : "Good evening"}
          , {displayName}
        </h1>

        <Text className="text-base sm:text-lg md:text-xl text-foreground/80 font-normal tracking-wide mt-3 max-w-xl">
          Let&apos;s start a new session and improve our skills
        </Text>

        <div className="flex flex-wrap items-center justify-center gap-4 mt-8 w-full max-w-xl">
          <Button
            variant="primary"
            size="default"
            href={startHref}
            className="flex-1 basis-0 min-w-55 rounded-full px-12 h-12 text-lg sm:text-xl font-bold text-bg tracking-wide shadow-lg shadow-primary/20 justify-center text-center"
          >
            Start
          </Button>

          <Button
            variant="glass"
            borderGradient="nav"
            size="default"
            href={historyHref}
            className="flex-1 basis-0 min-w-55 rounded-full px-12 h-12 text-lg sm:text-xl font-bold text-fg tracking-wide justify-center text-center"
          >
            Sessions history
          </Button>
        </div>

        <Text className="text-center text-md text-foreground/50 mt-5 leading-relaxed font-normal max-w-md mx-auto">
          You will be asked to grant camera and microphone access.
          <br />
          Please allow these permissions to start the session.
        </Text>
      </main>
    </div>
  );
}
