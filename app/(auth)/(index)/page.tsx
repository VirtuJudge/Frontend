"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components";
import { WorkspaceNavBar } from "@/components/Nav-Bar";
import { useAuth } from "@/features/auth";
import { apiClient } from "@/lib/api/client";
import { Text } from "@/components/text";

export default function RootPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: teamsPage, isLoading: isTeamsLoading } = useQuery({
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
  const activeProjectId =
    selectedProjectId && teamProjects.some((p) => p.id === selectedProjectId)
      ? selectedProjectId
      : teamProjects[0]?.id;

  const isInitializingRef = useRef(false);

  useEffect(() => {
    if (!user || isTeamsLoading || isInitializingRef.current) return;

    const setupKey = `default_setup_done_${user.id}`;
    const alreadySetup =
      typeof window !== "undefined" &&
      localStorage.getItem(setupKey) === "true";

    if (alreadySetup) return;

    const isNewRegistered =
      typeof window !== "undefined" &&
      (localStorage.getItem("is_new_registration") === "true" ||
        localStorage.getItem("virtujudge_new_user") === "true");

    // Automatically create default team and project if newly registered user visits / for the first time
    if (isNewRegistered || teams.length === 0) {
      isInitializingRef.current = true;

      const initDefaultTeamAndProject = async () => {
        try {
          const userDisplayName =
            user.display_name?.trim() ||
            (user.email ? user.email.split("@")[0] : "") ||
            "User";
          const teamName = `${userDisplayName}'s Team`;
          const idempotencyKeyTeam = `team-default-${user.id}-${Date.now()}`;
          const newTeam = await apiClient.createTeam(
            teamName,
            idempotencyKeyTeam,
          );

          const idempotencyKeyProj = `proj-default-${user.id}-${Date.now()}`;
          const newProject = await apiClient.createProject(
            newTeam.id,
            { name: "Project 1" },
            idempotencyKeyProj,
          );

          setSelectedTeamId(newTeam.id);
          setSelectedProjectId(newProject.id);

          if (typeof window !== "undefined") {
            localStorage.setItem(setupKey, "true");
            localStorage.removeItem("is_new_registration");
            localStorage.removeItem("virtujudge_new_user");
          }

          await queryClient.invalidateQueries({ queryKey: ["teams"] });
          await queryClient.invalidateQueries({
            queryKey: ["teamProjects", newTeam.id],
          });
        } catch (error) {
          console.error(
            "Failed to initialize default team and project:",
            error,
          );
          isInitializingRef.current = false;
        }
      };

      initDefaultTeamAndProject();
    }
  }, [user, isTeamsLoading, teams.length, queryClient]);

  const startHref = activeProjectId
    ? `/projects/${activeProjectId}/session/prepare`
    : "/projects";

  const historyHref = activeProjectId
    ? `/projects/${activeProjectId}#sessions`
    : "/projects";

  const displayName = user?.display_name;

  return (
    <div className="flex flex-col items-center justify-center sm:items-start md:h-[calc(100vh-200px)] w-full relative">
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
