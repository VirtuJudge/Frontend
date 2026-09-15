import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RootPage from "@/app/(auth)/(index)/page";
import AuthenticatedLayout from "@/app/(auth)/layout";
import { AuthProvider, ensureDefaultTeamAndProject, formatDefaultTeamName } from "@/features/auth";
import { apiClient } from "@/lib/api/client";
import { getSupabaseClient } from "@/lib/auth/supabase";
import { createSyntheticJwt } from "@/lib/auth/jwt";
import type { Team, Project, User } from "@/lib/api/types";

vi.mock("@/lib/auth/supabase", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/supabase")>(
    "@/lib/auth/supabase",
  );
  return {
    ...actual,
    getSupabaseClient: vi.fn(),
  };
});

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{ui}</AuthProvider>
    </QueryClientProvider>,
  );
}

describe("Default Team & Project Creation for First-Time User Login", () => {
  const mockToken = createSyntheticJwt({
    sub: "user_new_123",
    email: "sarah@example.com",
    user_metadata: {
      display_name: "Sarah Connor",
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    vi.mocked(getSupabaseClient).mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              access_token: mockToken,
              user: {
                id: "user_new_123",
                email: "sarah@example.com",
                user_metadata: { display_name: "Sarah Connor" },
              },
            },
          },
          error: null,
        }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } },
        }),
      },
    } as unknown as ReturnType<typeof getSupabaseClient>);

    vi.spyOn(apiClient, "getMe").mockResolvedValue({
      id: "user_new_123",
      email: "sarah@example.com",
      display_name: "Sarah Connor",
      created_at: new Date().toISOString(),
    });
  });

  it("formats team name correctly with display name, email, or fallback", () => {
    expect(formatDefaultTeamName("Sarah Connor", "sarah@example.com")).toBe(
      "Sarah Connor's Team",
    );
    expect(formatDefaultTeamName("", "alex@example.com")).toBe("alex's Team");
    expect(formatDefaultTeamName(null, "user@test.org")).toBe("user's Team");
    expect(formatDefaultTeamName(undefined, undefined)).toBe("User's Team");
  });

  it("automatically creates a new team (displayname's Team) and project (Project 1) if user logs in for first time with no team or project", async () => {
    let teamsList: Team[] = [];

    vi.spyOn(apiClient, "getTeams").mockImplementation(async () => {
      return {
        items: teamsList,
        has_more: false,
      };
    });

    vi.spyOn(apiClient, "getProjects").mockResolvedValue({
      items: [],
      has_more: false,
    });

    const createTeamSpy = vi
      .spyOn(apiClient, "createTeam")
      .mockImplementation(async (name: string) => {
        const newTeam: Team = {
          id: "team_default_999",
          name,
          role: "owner",
          member_count: 1,
          created_at: new Date().toISOString(),
          version: 1,
        };
        teamsList = [newTeam];
        return newTeam;
      });

    const createProjectSpy = vi
      .spyOn(apiClient, "createProject")
      .mockImplementation(
        async (
          teamId: string,
          data: { name: string; description?: string },
        ) => {
          const newProject: Project = {
            id: "project_default_111",
            team_id: teamId,
            name: data.name,
            description: data.description,
            created_by: "user_new_123",
            created_at: new Date().toISOString(),
            version: 1,
          };
          return newProject;
        },
      );

    renderWithProviders(<RootPage />);

    await waitFor(() => {
      expect(createTeamSpy).toHaveBeenCalledWith(
        "Sarah Connor's Team",
        expect.stringContaining("team-default-user_new_123"),
      );
      expect(createProjectSpy).toHaveBeenCalledWith(
        "team_default_999",
        { name: "Project 1" },
        expect.stringContaining("proj-default-user_new_123"),
      );
    });

    // Verify localStorage setup flag was marked done
    expect(localStorage.getItem("default_setup_done_user_new_123")).toBe("true");
  });

  it("automatically creates default team and project via AuthenticatedLayout on login", async () => {
    let teamsList: Team[] = [];

    vi.spyOn(apiClient, "getTeams").mockImplementation(async () => {
      return {
        items: teamsList,
        has_more: false,
      };
    });

    vi.spyOn(apiClient, "getProjects").mockResolvedValue({
      items: [],
      has_more: false,
    });

    const createTeamSpy = vi
      .spyOn(apiClient, "createTeam")
      .mockImplementation(async (name: string) => {
        const newTeam: Team = {
          id: "team_layout_111",
          name,
          role: "owner",
          member_count: 1,
          created_at: new Date().toISOString(),
          version: 1,
        };
        teamsList = [newTeam];
        return newTeam;
      });

    const createProjectSpy = vi
      .spyOn(apiClient, "createProject")
      .mockImplementation(
        async (
          teamId: string,
          data: { name: string; description?: string },
        ) => {
          return {
            id: "project_layout_222",
            team_id: teamId,
            name: data.name,
            description: data.description,
            created_by: "user_new_123",
            created_at: new Date().toISOString(),
            version: 1,
          };
        },
      );

    renderWithProviders(
      <AuthenticatedLayout>
        <div data-testid="child-page">Child Content</div>
      </AuthenticatedLayout>,
    );

    await waitFor(() => {
      expect(createTeamSpy).toHaveBeenCalledWith(
        "Sarah Connor's Team",
        expect.stringContaining("team-default-user_new_123"),
      );
      expect(createProjectSpy).toHaveBeenCalledWith(
        "team_layout_111",
        { name: "Project 1" },
        expect.stringContaining("proj-default-user_new_123"),
      );
    });

    expect(screen.getByTestId("child-page")).toBeDefined();
    expect(localStorage.getItem("default_setup_done_user_new_123")).toBe("true");
  });

  it("does not create default team or project if setup is already completed", async () => {
    localStorage.setItem("default_setup_done_user_new_123", "true");

    vi.spyOn(apiClient, "getTeams").mockResolvedValue({
      items: [],
      has_more: false,
    });

    vi.spyOn(apiClient, "getProjects").mockResolvedValue({
      items: [],
      has_more: false,
    });

    const createTeamSpy = vi.spyOn(apiClient, "createTeam");
    const createProjectSpy = vi.spyOn(apiClient, "createProject");

    renderWithProviders(<RootPage />);

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(createTeamSpy).not.toHaveBeenCalled();
    expect(createProjectSpy).not.toHaveBeenCalled();
  });

  it("does not create default team or project if user already has existing teams and projects", async () => {
    vi.spyOn(apiClient, "getTeams").mockResolvedValue({
      items: [
        {
          id: "team_existing_1",
          name: "Existing Team",
          role: "owner",
          member_count: 2,
          created_at: new Date().toISOString(),
          version: 1,
        },
      ],
      has_more: false,
    });

    vi.spyOn(apiClient, "getProjects").mockResolvedValue({
      items: [
        {
          id: "proj_existing_1",
          team_id: "team_existing_1",
          name: "Existing Project",
          created_by: "user_new_123",
          created_at: new Date().toISOString(),
          version: 1,
        },
      ],
      has_more: false,
    });

    const createTeamSpy = vi.spyOn(apiClient, "createTeam");
    const createProjectSpy = vi.spyOn(apiClient, "createProject");

    renderWithProviders(<RootPage />);

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(createTeamSpy).not.toHaveBeenCalled();
    expect(createProjectSpy).not.toHaveBeenCalled();
  });

  it("creates Project 1 if user has a team but no project in it", async () => {
    vi.spyOn(apiClient, "getTeams").mockResolvedValue({
      items: [
        {
          id: "team_has_no_proj",
          name: "Sarah's Team",
          role: "owner",
          member_count: 1,
          created_at: new Date().toISOString(),
          version: 1,
        },
      ],
      has_more: false,
    });

    vi.spyOn(apiClient, "getProjects").mockResolvedValue({
      items: [],
      has_more: false,
    });

    const createTeamSpy = vi.spyOn(apiClient, "createTeam");
    const createProjectSpy = vi.spyOn(apiClient, "createProject").mockResolvedValue({
      id: "project_new_1",
      team_id: "team_has_no_proj",
      name: "Project 1",
      created_by: "user_new_123",
      created_at: new Date().toISOString(),
      version: 1,
    });

    renderWithProviders(<RootPage />);

    await waitFor(() => {
      expect(createTeamSpy).not.toHaveBeenCalled();
      expect(createProjectSpy).toHaveBeenCalledWith(
        "team_has_no_proj",
        { name: "Project 1" },
        expect.stringContaining("proj-default-user_new_123"),
      );
    });
  });

  it("deduplicates concurrent calls to ensureDefaultTeamAndProject", async () => {
    let teamsList: Team[] = [];

    vi.spyOn(apiClient, "getTeams").mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return {
        items: teamsList,
        has_more: false,
      };
    });

    const createTeamSpy = vi
      .spyOn(apiClient, "createTeam")
      .mockImplementation(async (name: string) => {
        const newTeam: Team = {
          id: "team_dedup_1",
          name,
          role: "owner",
          member_count: 1,
          created_at: new Date().toISOString(),
          version: 1,
        };
        teamsList = [newTeam];
        return newTeam;
      });

    const createProjectSpy = vi
      .spyOn(apiClient, "createProject")
      .mockResolvedValue({
        id: "proj_dedup_1",
        team_id: "team_dedup_1",
        name: "Project 1",
        created_by: "user_new_123",
        created_at: new Date().toISOString(),
        version: 1,
      });

    const user: User = {
      id: "user_new_123",
      display_name: "Sarah Connor",
      email: "sarah@example.com",
      created_at: new Date().toISOString(),
    };

    // Call concurrently multiple times
    const [res1, res2, res3] = await Promise.all([
      ensureDefaultTeamAndProject(user),
      ensureDefaultTeamAndProject(user),
      ensureDefaultTeamAndProject(user),
    ]);

    expect(createTeamSpy).toHaveBeenCalledTimes(1);
    expect(createProjectSpy).toHaveBeenCalledTimes(1);
    expect(res1.team?.id).toBe("team_dedup_1");
    expect(res2.team?.id).toBe("team_dedup_1");
    expect(res3.team?.id).toBe("team_dedup_1");
  });
});
