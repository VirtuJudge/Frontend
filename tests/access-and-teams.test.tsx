import React from "react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TeamDashboard } from "@/features/teams/team-dashboard";
import { apiClient } from "@/lib/api/client";

vi.mock("@/features/auth", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "alice@example.com", display_name: "Alice" },
    token: "test-token",
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  usePathname: () => "/teams/team-1",
}));

function renderTeamDashboard(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>,
  );
}

describe("TeamDashboard - Null Display Name Handling", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("safely renders fallback when a peer has null display_name and omits synthetic email", async () => {
    vi.spyOn(apiClient, "getTeam").mockResolvedValue({
      id: "team-1",
      name: "Engineering",
      role: "owner",
      member_count: 2,
      created_at: "2026-10-01T00:00:00Z",
      version: 1,
    });

    vi.spyOn(apiClient, "getProjects").mockResolvedValue({
      items: [],
      next_cursor: null,
    });

    vi.spyOn(apiClient, "getTeamMembers").mockResolvedValue({
      items: [
        {
          team_id: "team-1",
          user_id: "user-1",
          role: "owner",
          display_name: "Alice",
          joined_at: "2026-10-01T00:00:00Z",
          version: 1,
        },
        {
          team_id: "team-1",
          user_id: "user-2",
          role: "member",
          display_name: null,
          joined_at: "2026-10-02T00:00:00Z",
          version: 1,
        },
      ],
      next_cursor: null,
    });

    vi.spyOn(apiClient, "getTeamInvitations").mockResolvedValue({
      items: [],
      next_cursor: null,
    });

    renderTeamDashboard(<TeamDashboard teamId="team-1" />);

    expect(await screen.findByText("Alice")).toBeDefined();
    expect(screen.getByText("alice@example.com")).toBeDefined();

    // Peer with null display_name renders fallback "Team Member"
    expect(screen.getByText("Team Member")).toBeDefined();

    // No synthetic email derived from display name
    expect(screen.queryByText(/@mail\.com$/)).toBeNull();
  });

  it("safely renders fallback when current user has null display_name", async () => {
    vi.spyOn(apiClient, "getTeam").mockResolvedValue({
      id: "team-1",
      name: "Engineering",
      role: "member",
      member_count: 1,
      created_at: "2026-10-01T00:00:00Z",
      version: 1,
    });

    vi.spyOn(apiClient, "getProjects").mockResolvedValue({
      items: [],
      next_cursor: null,
    });

    vi.spyOn(apiClient, "getTeamMembers").mockResolvedValue({
      items: [
        {
          team_id: "team-1",
          user_id: "user-1",
          role: "member",
          display_name: null,
          joined_at: "2026-10-01T00:00:00Z",
          version: 1,
        },
      ],
      next_cursor: null,
    });

    renderTeamDashboard(<TeamDashboard teamId="team-1" />);

    expect(await screen.findByText("(you)")).toBeDefined();
    expect(screen.getByText("Team Member")).toBeDefined();
    expect(screen.getByText("alice@example.com")).toBeDefined();
  });
});
