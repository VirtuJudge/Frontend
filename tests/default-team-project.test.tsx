import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RootPage from "@/app/(auth)/(index)/page";
import { AuthProvider } from "@/features/auth";
import { apiClient } from "@/lib/api/client";
import { getSupabaseClient } from "@/lib/auth/supabase";
import { createSyntheticJwt } from "@/lib/auth/jwt";
import type { Team, Project } from "@/lib/api/types";

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

describe("Default Team & Project Creation for New Registered User", () => {
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

  it("automatically creates default team (user display name's Team) and project (Project 1) for newly registered user on first visit to /", async () => {
    localStorage.setItem("is_new_registration", "true");

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

    // Verify localStorage flags were properly updated
    expect(localStorage.getItem("is_new_registration")).toBeNull();
    expect(localStorage.getItem("default_setup_done_user_new_123")).toBe("true");
  });

  it("does not create default team or project if user already has completed setup", async () => {
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

  it("does not create default team or project if user already has existing teams and is not new", async () => {
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
});
