import { apiClient } from "@/lib/api/client";
import type { User, Team, Project } from "@/lib/api/types";
import type { QueryClient } from "@tanstack/react-query";

// In-memory locks to prevent concurrent duplicate creation per user
const inFlightInits = new Map<
  string,
  Promise<DefaultWorkspaceResult>
>();

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
 * Ensures a user has at least one team (displayname's Team) and project (Project 1).
 * If the user logs in for the first time and has no team or project,
 * this function creates them and flags setup as completed.
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

  // Deduplicate concurrent calls for the same user ID
  const inFlight = inFlightInits.get(userId);
  if (inFlight) {
    return inFlight;
  }

  const initPromise = (async (): Promise<DefaultWorkspaceResult> => {
    try {
      // 1. Fetch user teams
      const teamsPage = await apiClient.getTeams();
      const teams = teamsPage?.items || [];

      let activeTeam: Team | null = null;
      let activeProject: Project | null = null;
      let created = false;

      if (teams.length === 0) {
        // User has no team and no project -> create both
        const teamName = formatDefaultTeamName(user.display_name, user.email);
        const idempotencyKeyTeam = `team-default-${userId}-${Date.now()}`;
        activeTeam = await apiClient.createTeam(teamName, idempotencyKeyTeam);

        const idempotencyKeyProj = `proj-default-${userId}-${Date.now()}`;
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
            const idempotencyKeyProj = `proj-default-${userId}-${Date.now()}`;
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

      // Mark setup as completed in localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem(setupKey, "true");
        localStorage.removeItem("is_new_registration");
        localStorage.removeItem("virtujudge_new_user");
      }

      // Invalidate relevant queries so the UI updates immediately
      if (queryClient) {
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
