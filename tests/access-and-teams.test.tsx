import React from "react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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
      has_more: false,
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
      has_more: false,
    });

    vi.spyOn(apiClient, "getTeamInvitations").mockResolvedValue({
      items: [],
      has_more: false,
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
      has_more: false,
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
      has_more: false,
    });

    renderTeamDashboard(<TeamDashboard teamId="team-1" />);

    expect(await screen.findByText("(you)")).toBeDefined();
    expect(screen.getByText("Team Member")).toBeDefined();
    expect(screen.getByText("alice@example.com")).toBeDefined();
  });

  it("determines user permissions when owner is outside the first page and enables owner controls", async () => {
    // TeamResponse has no role or defaults to member
    vi.spyOn(apiClient, "getTeam").mockResolvedValue({
      id: "team-1",
      name: "Engineering",
      role: "member",
      member_count: 52,
      created_at: "2026-10-01T00:00:00Z",
      version: 1,
    });

    vi.spyOn(apiClient, "getProjects").mockResolvedValue({
      items: [],
      has_more: false,
    });

    vi.spyOn(apiClient, "getTeamInvitations").mockResolvedValue({
      items: [],
      has_more: false,
    });

    // 50 members on first page, user-1 is NOT on page 1
    const page1Members = Array.from({ length: 50 }, (_, i) => ({
      team_id: "team-1",
      user_id: `member-${i + 2}`,
      role: "member" as const,
      display_name: `Member ${i + 2}`,
      joined_at: "2026-10-01T00:00:00Z",
      version: 1,
    }));

    // user-1 (Alice) is on page 2 as owner
    const page2Members = [
      {
        team_id: "team-1",
        user_id: "user-1",
        role: "owner" as const,
        display_name: "Alice",
        joined_at: "2026-10-02T00:00:00Z",
        version: 1,
      },
      {
        team_id: "team-1",
        user_id: "member-53",
        role: "member" as const,
        display_name: "Member 53",
        joined_at: "2026-10-03T00:00:00Z",
        version: 1,
      },
    ];

    vi.spyOn(apiClient, "getTeamMembers").mockImplementation(async (_teamId, cursor) => {
      if (!cursor) {
        return {
          items: page1Members,
          next_cursor: "cursor-page-2",
          has_more: true,
        };
      }
      if (cursor === "cursor-page-2") {
        return {
          items: page2Members,
          next_cursor: undefined,
          has_more: false,
        };
      }
      return { items: [], has_more: false };
    });

    renderTeamDashboard(<TeamDashboard teamId="team-1" />);

    // Even though Alice is on page 2, the independent role resolver finds her as owner
    // and enables the "Invite member" control
    expect(await screen.findByRole("button", { name: /invite member/i })).toBeDefined();
    expect(screen.getByText("Invitations")).toBeDefined();
  });

  it("consumes next_cursor and loads subsequent pages without duplicates or missing rows", async () => {
    vi.spyOn(apiClient, "getTeam").mockResolvedValue({
      id: "team-1",
      name: "Engineering",
      role: "owner",
      member_count: 3,
      created_at: "2026-10-01T00:00:00Z",
      version: 1,
    });

    vi.spyOn(apiClient, "getProjects").mockResolvedValue({
      items: [],
      has_more: false,
    });

    vi.spyOn(apiClient, "getTeamInvitations").mockResolvedValue({
      items: [],
      has_more: false,
    });

    vi.spyOn(apiClient, "getTeamMembers").mockImplementation(async (_teamId, cursor) => {
      if (!cursor) {
        return {
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
              display_name: "Bob",
              joined_at: "2026-10-02T00:00:00Z",
              version: 1,
            },
          ],
          next_cursor: "cursor-page-2",
          has_more: true,
        };
      }
      if (cursor === "cursor-page-2") {
        return {
          items: [
            {
              team_id: "team-1",
              user_id: "user-3",
              role: "member",
              display_name: "Charlie",
              joined_at: "2026-10-03T00:00:00Z",
              version: 1,
            },
          ],
          next_cursor: undefined,
          has_more: false,
        };
      }
      return { items: [], has_more: false };
    });

    renderTeamDashboard(<TeamDashboard teamId="team-1" />);

    expect(await screen.findByText("Alice")).toBeDefined();
    expect(screen.getByText("Bob")).toBeDefined();
    expect(screen.queryByText("Charlie")).toBeNull();

    const loadMoreButton = await screen.findByRole("button", { name: /load more members/i });
    expect(loadMoreButton).toBeDefined();

    // Click load more
    fireEvent.click(loadMoreButton);

    expect(await screen.findByText("Charlie")).toBeDefined();
    expect(screen.queryByRole("button", { name: /load more members/i })).toBeNull();
  });
});
