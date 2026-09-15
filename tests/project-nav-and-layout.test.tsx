import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as nextNavigation from "next/navigation";
import { NavDropdown, NavDropdownOption } from "@/components/nav-dropdown";
import {
  WorkspaceNavBar,
  ProjectNavBar,
} from "@/components/Nav-Bar/workspace-nav-bar";
import NavBar from "@/components/Nav-Bar/nav-bar";
import ProjectLayout from "@/app/(auth)/projects/layout";
import { ProjectDetailsContent } from "@/app/(auth)/projects/[projectId]/page";
import RootPage from "@/app/(auth)/(index)/page";
import { AuthProvider } from "@/features/auth";
import { apiClient } from "@/lib/api/client";

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

describe("Project Page Navigation & Custom Layout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(apiClient, "getTeams").mockResolvedValue({
      items: [
        {
          id: "01J6GZ2B000000000000000002",
          name: "VirtuJudge Pitch Team",
          role: "owner",
          member_count: 3,
          created_at: "2026-09-01T10:15:00Z",
          version: 1,
        },
        {
          id: "01J6GZ2B000000000000000009",
          name: "AI Pitch Accelerator",
          role: "member",
          member_count: 5,
          created_at: "2026-09-05T14:30:00Z",
          version: 1,
        },
      ],
      has_more: false,
    });
    vi.spyOn(apiClient, "getTeam").mockResolvedValue({
      id: "01J6GZ2B000000000000000002",
      name: "VirtuJudge Pitch Team",
      role: "owner",
      member_count: 3,
      created_at: "2026-09-01T10:15:00Z",
      version: 1,
    });
    vi.spyOn(apiClient, "getProjects").mockResolvedValue({
      items: [
        {
          id: "01J6GZ3C000000000000000003",
          team_id: "01J6GZ2B000000000000000002",
          name: "Series A Pitch Practice",
          description: "Preparing for the investor demo day showcase",
          created_by: "01J6GZ1A000000000000000001",
          created_at: "2026-09-01T11:00:00Z",
          version: 1,
        },
        {
          id: "01J6GZ3C000000000000000004",
          team_id: "01J6GZ2B000000000000000002",
          name: "Demo Day Showcase",
          description: "Final rehearsal before angel investor presentation",
          created_by: "01J6GZ1A000000000000000001",
          created_at: "2026-09-03T16:00:00Z",
          version: 1,
        },
      ],
      has_more: false,
    });
    vi.spyOn(apiClient, "getProject").mockResolvedValue({
      id: "01J6GZ3C000000000000000003",
      team_id: "01J6GZ2B000000000000000002",
      name: "Series A Pitch Practice",
      description: "Preparing for the investor demo day showcase",
      created_by: "01J6GZ1A000000000000000001",
      created_at: "2026-09-01T11:00:00Z",
      version: 1,
    });
    vi.spyOn(apiClient, "getAssets").mockResolvedValue({
      items: [
        {
          id: "01J6GZ6F000000000000000006",
          project_id: "01J6GZ3C000000000000000003",
          kind: "supporting_document",
          file_name: "investor_deck.pdf",
          media_type: "application/pdf",
          size_bytes: 12500000,
          state: "verified",
          checksum: "sha256:dummy",
          created_at: "2026-09-01T11:45:00Z",
        },
        {
          id: "01J6GZ6F000000000000000007",
          project_id: "01J6GZ3C000000000000000003",
          kind: "supporting_document",
          file_name: "pitch_deck.pptx",
          media_type:
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          size_bytes: 18400000,
          state: "verified",
          checksum: "sha256:dummy2",
          created_at: "2026-09-02T14:20:00Z",
        },
      ],
      has_more: false,
    });
    vi.spyOn(apiClient, "getPracticeSessions").mockResolvedValue({
      items: [
        {
          id: "01J6GZ4D000000000000000004",
          project_id: "01J6GZ3C000000000000000003",
          team_id: "01J6GZ2B000000000000000001",
          state: "ready",
          manifest_frozen: false,
          presentation_asset_id: "01J6GZ5E000000000000000005",
          document_asset_ids: ["01J6GZ6F000000000000000006"],
          stages: [],
          limitations: [],
          created_by: "01J6GZ1A000000000000000001",
          created_at: "2026-09-01T12:00:00Z",
          updated_at: "2026-09-01T12:00:00Z",
          version: 1,
        },
        {
          id: "01J6GZ4D000000000000000005",
          project_id: "01J6GZ3C000000000000000003",
          team_id: "01J6GZ2B000000000000000001",
          state: "completed",
          manifest_frozen: true,
          presentation_asset_id: "01J6GZ5E000000000000000005",
          document_asset_ids: ["01J6GZ6F000000000000000006"],
          stages: [],
          limitations: [],
          created_by: "01J6GZ1A000000000000000001",
          created_at: "2026-09-03T14:30:00Z",
          updated_at: "2026-09-03T14:30:00Z",
          version: 1,
        },
      ],
      has_more: false,
    });
  });

  describe("NavDropdown Component", () => {
    const mockOptions: NavDropdownOption[] = [
      { id: "opt-1", label: "Team Alpha", isActive: true },
      { id: "opt-2", label: "Team Beta", sublabel: "member" },
      { id: "opt-3", label: "Team Gamma" },
    ];

    it("renders trigger button with prefix and label", () => {
      render(
        <NavDropdown prefix="Team" label="Team Alpha" options={mockOptions} />,
      );

      expect(screen.getByText("Team Alpha")).toBeDefined();
      expect(
        screen.getByRole("button", { name: /team: team alpha/i }),
      ).toBeDefined();
      expect(screen.queryByText("Team Beta")).toBeNull();
    });

    it("opens menu when clicked and displays options with active indicator", () => {
      render(
        <NavDropdown prefix="Team" label="Team Alpha" options={mockOptions} />,
      );

      const button = screen.getByRole("button", { name: /team: team alpha/i });
      fireEvent.click(button);

      expect(screen.getByText("Team Beta")).toBeDefined();
      expect(screen.getByText("Team Gamma")).toBeDefined();
      expect(screen.getByText("member")).toBeDefined();
    });

    it("calls option onClick and closes menu on selection", async () => {
      const handleSelect = vi.fn();
      const optionsWithClick: NavDropdownOption[] = [
        { id: "opt-1", label: "Project One" },
        { id: "opt-2", label: "Project Two", onClick: handleSelect },
      ];

      render(
        <NavDropdown
          prefix="Project"
          label="Project One"
          options={optionsWithClick}
        />,
      );

      const button = screen.getByRole("button", {
        name: /project: project one/i,
      });
      fireEvent.click(button);

      const option2 = screen.getByText("Project Two");
      fireEvent.click(option2);

      expect(handleSelect).toHaveBeenCalledTimes(1);
      await waitFor(() => {
        expect(screen.queryByText("Project Two")).toBeNull();
      });
    });

    it("renders footer action and invokes its callback", async () => {
      const handleFooter = vi.fn();

      render(
        <NavDropdown
          prefix="Team"
          label="Current Team"
          options={mockOptions}
          footerAction={{
            label: "+ New Team",
            onClick: handleFooter,
          }}
        />,
      );

      const button = screen.getByRole("button", {
        name: /team: current team/i,
      });
      fireEvent.click(button);

      const newTeamBtn = screen.getByText("+ New Team");
      expect(newTeamBtn).toBeDefined();

      fireEvent.click(newTeamBtn);
      expect(handleFooter).toHaveBeenCalledTimes(1);

      await waitFor(() => {
        expect(screen.queryByText("+ New Team")).toBeNull();
      });
    });

    it("closes menu when Escape key is pressed", async () => {
      render(
        <NavDropdown prefix="Team" label="Team Alpha" options={mockOptions} />,
      );

      const button = screen.getByRole("button", { name: /team: team alpha/i });
      fireEvent.click(button);
      expect(screen.getByText("Team Beta")).toBeDefined();

      fireEvent.keyDown(window, { key: "Escape" });

      await waitFor(() => {
        expect(screen.queryByText("Team Beta")).toBeNull();
      });
    });

    it("closes menu when clicking outside", async () => {
      render(
        <div>
          <div data-testid="outside">Outside Element</div>
          <NavDropdown prefix="Team" label="Team Alpha" options={mockOptions} />
        </div>,
      );

      const button = screen.getByRole("button", { name: /team: team alpha/i });
      fireEvent.click(button);
      expect(screen.getByText("Team Beta")).toBeDefined();

      fireEvent.mouseDown(screen.getByTestId("outside"));

      await waitFor(() => {
        expect(screen.queryByText("Team Beta")).toBeNull();
      });
    });

    it("defaults to the first element if the user didn't choose", () => {
      const optionsWithoutActive: NavDropdownOption[] = [
        { id: "opt-1", label: "Alpha Team" },
        { id: "opt-2", label: "Beta Team" },
      ];

      render(<NavDropdown prefix="Team" options={optionsWithoutActive} />);

      expect(screen.getByText("Alpha Team")).toBeDefined();
      expect(
        screen.getByRole("button", { name: /team: alpha team/i }),
      ).toBeDefined();
    });

    it("updates selection when an option is selected from default", async () => {
      const optionsWithoutActive: NavDropdownOption[] = [
        { id: "opt-1", label: "First Project" },
        { id: "opt-2", label: "Second Project" },
      ];

      render(<NavDropdown prefix="Project" options={optionsWithoutActive} />);

      expect(screen.getByText("First Project")).toBeDefined();

      const button = screen.getByRole("button", {
        name: /project: first project/i,
      });
      fireEvent.click(button);

      const secondOpt = screen.getByText("Second Project");
      fireEvent.click(secondOpt);

      expect(
        screen.getByRole("button", { name: /project: second project/i }),
      ).toBeDefined();
    });
  });

  describe("WorkspaceNavBar Component", () => {
    it("renders brand, team dropdown, project dropdown, and My Account button", async () => {
      renderWithProviders(
        <WorkspaceNavBar
          initialProjectId="01J6GZ3C000000000000000003"
          initialTeamId="01J6GZ2B000000000000000002"
        />,
      );

      // Logo/brand
      expect(screen.getByAltText("VirtuJudge Logo")).toBeDefined();

      // Team Dropdown
      await waitFor(() => {
        expect(screen.getByText("VirtuJudge Pitch Team")).toBeDefined();
      });

      // Project Dropdown
      await waitFor(() => {
        expect(screen.getByText("Series A Pitch Practice")).toBeDefined();
      });

      // My Account button on right
      const myAccountLink = screen.getByRole("link", { name: /my account/i });
      expect(myAccountLink).toBeDefined();
      expect(myAccountLink.getAttribute("href")).toBe("/dashboard");
    });

    it("defaults to the first team and project if the user has not chosen", async () => {
      renderWithProviders(<WorkspaceNavBar />);

      await waitFor(() => {
        expect(screen.getByText("VirtuJudge Pitch Team")).toBeDefined();
      });

      await waitFor(() => {
        expect(screen.getByText("Series A Pitch Practice")).toBeDefined();
      });
    });

    it("allows switching teams via the team dropdown", async () => {
      const pushSpy = vi.fn();
      vi.spyOn(nextNavigation, "useRouter").mockReturnValue({
        push: pushSpy,
        replace: vi.fn(),
        prefetch: vi.fn(),
        back: vi.fn(),
        forward: vi.fn(),
        refresh: vi.fn(),
      } as unknown as ReturnType<typeof nextNavigation.useRouter>);

      renderWithProviders(
        <ProjectNavBar
          initialProjectId="01J6GZ3C000000000000000003"
          initialTeamId="01J6GZ2B000000000000000002"
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("VirtuJudge Pitch Team")).toBeDefined();
      });

      const teamDropdownBtn = screen.getByRole("button", {
        name: /current team selector/i,
      });
      fireEvent.click(teamDropdownBtn);

      // Select AI Pitch Accelerator
      await waitFor(() => {
        expect(screen.getByText("AI Pitch Accelerator")).toBeDefined();
      });

      fireEvent.click(screen.getByText("AI Pitch Accelerator"));

      expect(pushSpy).toHaveBeenCalledWith("/teams/01J6GZ2B000000000000000009");
    });

    it("allows switching projects via the project dropdown", async () => {
      const pushSpy = vi.fn();
      vi.spyOn(nextNavigation, "useRouter").mockReturnValue({
        push: pushSpy,
        replace: vi.fn(),
        prefetch: vi.fn(),
        back: vi.fn(),
        forward: vi.fn(),
        refresh: vi.fn(),
      } as unknown as ReturnType<typeof nextNavigation.useRouter>);

      renderWithProviders(
        <ProjectNavBar
          initialProjectId="01J6GZ3C000000000000000003"
          initialTeamId="01J6GZ2B000000000000000002"
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("Series A Pitch Practice")).toBeDefined();
      });

      const projectDropdownBtn = screen.getByRole("button", {
        name: /current project selector/i,
      });
      fireEvent.click(projectDropdownBtn);

      // Select Demo Day Showcase
      await waitFor(() => {
        expect(screen.getByText("Demo Day Showcase")).toBeDefined();
      });

      fireEvent.click(screen.getByText("Demo Day Showcase"));

      expect(pushSpy).toHaveBeenCalledWith(
        "/projects/01J6GZ3C000000000000000004",
      );
    });
  });

  describe("ProjectLayout Component", () => {
    it("renders children within layout wrapper", async () => {
      renderWithProviders(
        <ProjectLayout>
          <div data-testid="project-content">Project Body Test Content</div>
        </ProjectLayout>,
      );

      expect(screen.getByTestId("project-content")).toBeDefined();
    });
  });

  describe("Layout Navigation Isolation", () => {
    it("renders children in ProjectLayout", () => {
      renderWithProviders(
        <ProjectLayout>
          <div data-testid="isolated-content">Project Content</div>
        </ProjectLayout>,
      );

      expect(screen.getByTestId("isolated-content")).toBeDefined();
    });

    it("renders global NavBar in standard layouts without pathname sniffing", () => {
      renderWithProviders(<NavBar />);
      expect(screen.getAllByAltText("VirtuJudge Logo").length).toBeGreaterThan(
        0,
      );
    });
  });

  describe("ProjectDetailsPage Component", () => {
    it("renders assets and sessions sections with action controls", async () => {
      renderWithProviders(
        <ProjectDetailsContent projectId="01J6GZ3C000000000000000003" />,
      );

      // Section titles
      expect(await screen.findByText("Assets")).toBeDefined();
      expect(screen.getByText("Sessions")).toBeDefined();

      // Assets rendered
      expect(screen.getByText("investor_deck.pdf")).toBeDefined();
      expect(screen.getByText("pitch_deck.pptx")).toBeDefined();

      // Sessions rendered with assets count
      expect(screen.getByText("Session 1")).toBeDefined();
      expect(screen.getByText("Session 2")).toBeDefined();

      // Link to prepare session
      const sessionLinks = screen.getAllByRole("link", {
        name: /open session 1/i,
      });
      expect(sessionLinks.length).toBeGreaterThan(0);
      expect(sessionLinks[0].getAttribute("href")).toContain("/session/");
    });
  });

  describe("RootPage (/) Component", () => {
    it("renders greeting, subtitle, action buttons, disclaimer, and bottom stage card", async () => {
      renderWithProviders(<RootPage />);

      // Greeting (Good morning/afternoon/evening ...)
      expect(
        screen.getByText(/good (morning|afternoon|evening)/i),
      ).toBeDefined();

      // Subtitle
      expect(
        screen.getByText(/let's start a new session and improve our skills/i),
      ).toBeDefined();

      // Buttons (rendered as links to their destinations)
      expect(screen.getByRole("link", { name: /^start$/i })).toBeDefined();
      expect(
        screen.getByRole("link", { name: /sessions history/i }),
      ).toBeDefined();

      // Disclaimer text
      expect(screen.getByText(/camera and microphone/i)).toBeDefined();

      // Top navbar elements
      expect(screen.getAllByAltText("VirtuJudge Logo").length).toBeGreaterThan(
        0,
      );
      expect(screen.getByRole("link", { name: /my account/i })).toBeDefined();
    });

    it("navigates to prepare page on Start and links to #sessions on Sessions history", async () => {
      renderWithProviders(<RootPage />);

      await waitFor(() => {
        const historyLink = screen.getByRole("link", {
          name: /sessions history/i,
        });
        expect(historyLink.getAttribute("href")).toContain("#sessions");

        const startLink = screen.getByRole("link", {
          name: /^start$/i,
        });
        expect(startLink.getAttribute("href")).toContain("/session/prepare");
      });
    });
  });
});
