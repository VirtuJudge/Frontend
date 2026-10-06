import { apiClient, ApiClientError } from "@/lib/api/client";
import type { User, Team, Project, Page } from "@/lib/api/types";
import type { QueryClient } from "@tanstack/react-query";

// In-memory locks to prevent concurrent duplicate creation per user
const inFlightInits = new Map<string, Promise<DefaultWorkspaceResult>>();

export interface DefaultWorkspaceResult {
  team: Team | null;
  project: Project | null;
  created: boolean;
}

export function formatDefaultTeamName(
  displayName?: string | null,
  email?: string | null,
): string {
  const name =
    displayName?.trim() ||
    (email ? email.split("@")[0].trim() : "") ||
    "User";
  return `${name}'s Team`;
}

/**
 * Returns stable, deterministic idempotency keys for default workspace operations.
 * These keys are scoped strictly to the user and operation to prevent duplicates on retries.
 */
export function getDefaultWorkspaceIdempotencyKeys(userId: string) {
  return {
    teamKey: `team-default-${userId}`,
    projectKey: `proj-default-${userId}`,
  };
}

/**
 * Ensures a user has at least one team and project.
 * Uses stable, deterministic operation keys across retries and tabs to ensure idempotency.
 */
export async function ensureDefaultTeamAndProject(
  user: User,
  queryClient?: QueryClient,
): Promise<DefaultWorkspaceResult> {
  if (!user || !user.id) {
    return { team: null, project: null, created: false };
  }

  const userId = user.id;
  const setupKey = `default_setup_done_${userId}`;

  // Check if setup already marked completed in localStorage
  if (
    typeof window !== "undefined" &&
    localStorage.getItem(setupKey) === "true"
  ) {
    return { team: null, project: null, created: false };
  }

  // Deduplicate concurrent calls for the same user ID in memory
  const inFlight = inFlightInits.get(userId);
  if (inFlight) {
    return inFlight;
  }

  const { teamKey: idempotencyKeyTeam, projectKey: idempotencyKeyProj } =
    getDefaultWorkspaceIdempotencyKeys(userId);

  const initPromise = (async (): Promise<DefaultWorkspaceResult> => {
    try {
      const teamsPage = await apiClient.getTeams();
      const teams = teamsPage?.items || [];

      let activeTeam: Team | null = null;
      let activeProject: Project | null = null;
      let created = false;

      if (teams.length === 0) {
        const baseTeamName = `${user.display_name}'s Team`;

        try {
          activeTeam = await apiClient.createTeam(
            baseTeamName,
            idempotencyKeyTeam,
          );
        } catch (err: unknown) {
          const isConflict =
            (err instanceof ApiClientError && err.status === 409) ||
            (err instanceof Error && err.message.includes("409"));

          if (isConflict) {
            try {
              const refreshed = await apiClient.getTeams();
              if (refreshed?.items && refreshed.items.length > 0) {
                activeTeam =
                  refreshed.items.find((t) => t.name === baseTeamName) ||
                  refreshed.items[0];
              }
            } catch {}
          }

          if (!activeTeam) {
            throw err;
          }
        }

        activeProject = await apiClient.createProject(
          activeTeam.id,
          { name: "Project 1" },
          idempotencyKeyProj,
        );
        created = true;
      } else {
        // User already has at least one team
        activeTeam = teams[0];

        // Check if this team has any project
        try {
          const projectsPage = await apiClient.getProjects(activeTeam.id);
          const projects = projectsPage?.items || [];
          if (projects.length === 0) {
            activeProject = await apiClient.createProject(
              activeTeam.id,
              { name: "Project 1" },
              idempotencyKeyProj,
            );
            created = true;
          } else {
            activeProject = projects[0];
          }
        } catch (projErr) {
          console.warn("Failed to check or create project for team:", projErr);
        }
      }

      // Only mark setup completed if both team and project exist
      if (activeTeam && activeProject) {
        if (typeof window !== "undefined") {
          localStorage.setItem(setupKey, "true");
          localStorage.removeItem("is_new_registration");
          localStorage.removeItem("virtujudge_new_user");
        }
      }

      // Populate query client caches
      if (queryClient) {
        if (activeTeam) {
          queryClient.setQueryData(["teams"], (old: Page<Team> | undefined) => {
            if (!old) return { items: [activeTeam!], has_more: false };
            const existing = old.items || [];
            if (existing.some((t) => t.id === activeTeam!.id)) return old;
            return { ...old, items: [activeTeam!, ...existing] };
          });
          queryClient.setQueryData(["team", activeTeam.id], activeTeam);
        }
        if (activeTeam && activeProject) {
          queryClient.setQueryData(
            ["teamProjects", activeTeam.id],
            (old: Page<Project> | undefined) => {
              if (!old) return { items: [activeProject!], has_more: false };
              const existing = old.items || [];
              if (existing.some((p) => p.id === activeProject!.id)) return old;
              return { ...old, items: [activeProject!, ...existing] };
            },
          );
          queryClient.setQueryData(
            ["project", activeProject.id],
            activeProject,
          );
        }
        await queryClient.invalidateQueries({ queryKey: ["teams"] });
        if (activeTeam) {
          await queryClient.invalidateQueries({
            queryKey: ["teamProjects", activeTeam.id],
          });
        }
      }

      return { team: activeTeam, project: activeProject, created };
    } catch (error) {
      console.warn("Could not ensure default workspace for user:", error);
      return { team: null, project: null, created: false };
    } finally {
      inFlightInits.delete(userId);
    }
  })();

  inFlightInits.set(userId, initPromise);
  return initPromise;
}
