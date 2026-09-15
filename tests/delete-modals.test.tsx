import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  DeleteProjectModal,
  DeleteAssetModal,
  DeleteSessionModal,
} from "@/features/projects";
import { apiClient } from "@/lib/api/client";
import { Project, Asset, PracticeSession } from "@/lib/api/types";

describe("Delete Modals (Project, Asset, Session)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("DeleteProjectModal", () => {
    const mockProject: Project = {
      id: "proj-123",
      team_id: "team-abc",
      name: "Autonomous Drone Pitch",
      description: "Pitch for seed investors",
      created_by: "user-1",
      created_at: "2026-09-01T12:00:00Z",
      version: 1,
    };

    it("renders project deletion modal with confirmation message", () => {
      render(
        <DeleteProjectModal
          project={mockProject}
          isOpen={true}
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByText("Delete Project")).toBeDefined();
      expect(screen.getByText("Autonomous Drone Pitch")).toBeDefined();
      expect(
        screen.getByRole("button", { name: /delete project/i }),
      ).toBeDefined();
      expect(screen.getByRole("button", { name: /cancel/i })).toBeDefined();
    });

    it("calls apiClient.deleteProject and onProjectDeleted when confirmed", async () => {
      const deleteSpy = vi
        .spyOn(apiClient, "deleteProject")
        .mockResolvedValue(undefined);
      const onProjectDeleted = vi.fn();
      const onClose = vi.fn();

      render(
        <DeleteProjectModal
          project={mockProject}
          isOpen={true}
          onClose={onClose}
          onProjectDeleted={onProjectDeleted}
        />,
      );

      const deleteBtn = screen.getByRole("button", { name: /delete project/i });
      fireEvent.click(deleteBtn);

      await waitFor(() => {
        expect(deleteSpy).toHaveBeenCalledWith("proj-123");
        expect(onProjectDeleted).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
      });
    });

    it("displays error message if deletion fails", async () => {
      vi.spyOn(apiClient, "deleteProject").mockRejectedValue(
        new Error("Server error deleting project"),
      );

      render(
        <DeleteProjectModal
          project={mockProject}
          isOpen={true}
          onClose={vi.fn()}
        />,
      );

      const deleteBtn = screen.getByRole("button", { name: /delete project/i });
      fireEvent.click(deleteBtn);

      expect(
        await screen.findByText("Server error deleting project"),
      ).toBeDefined();
    });

    it("returns null when project is null", () => {
      const { container } = render(
        <DeleteProjectModal project={null} isOpen={true} onClose={vi.fn()} />,
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe("DeleteAssetModal", () => {
    const mockAsset: Asset = {
      id: "asset-123",
      project_id: "proj-123",
      kind: "supporting_document",
      file_name: "pitch_deck.pdf",
      media_type: "application/pdf",
      size_bytes: 1048576,
      state: "verified",
      created_at: "2026-09-01T12:00:00Z",
    };

    it("renders asset deletion modal and deletes on confirm", async () => {
      const deleteSpy = vi
        .spyOn(apiClient, "deleteAsset")
        .mockResolvedValue(undefined);
      const onAssetDeleted = vi.fn();
      const onClose = vi.fn();

      render(
        <DeleteAssetModal
          asset={mockAsset}
          isOpen={true}
          onClose={onClose}
          onAssetDeleted={onAssetDeleted}
        />,
      );

      expect(screen.getByText("Delete Asset")).toBeDefined();
      expect(screen.getByText("pitch_deck.pdf")).toBeDefined();

      const deleteBtn = screen.getByRole("button", { name: /delete asset/i });
      fireEvent.click(deleteBtn);

      await waitFor(() => {
        expect(deleteSpy).toHaveBeenCalledWith("asset-123");
        expect(onAssetDeleted).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
      });
    });

    it("displays error message if asset deletion fails", async () => {
      vi.spyOn(apiClient, "deleteAsset").mockRejectedValue(
        new Error("Cannot delete verified asset"),
      );

      render(
        <DeleteAssetModal
          asset={mockAsset}
          isOpen={true}
          onClose={vi.fn()}
        />,
      );

      const deleteBtn = screen.getByRole("button", { name: /delete asset/i });
      fireEvent.click(deleteBtn);

      expect(
        await screen.findByText("Cannot delete verified asset"),
      ).toBeDefined();
    });
  });

  describe("DeleteSessionModal", () => {
    const mockSession: PracticeSession = {
      id: "sess-123",
      project_id: "proj-123",
      team_id: "team-abc",
      state: "ready",
      manifest_frozen: false,
      presentation_asset_id: "asset-1",
      document_asset_ids: [],
      stages: [],
      limitations: [],
      created_by: "user-1",
      created_at: "2026-09-01T12:00:00Z",
      updated_at: "2026-09-01T12:00:00Z",
      version: 1,
    };

    it("renders session deletion modal and deletes on confirm", async () => {
      const deleteSpy = vi
        .spyOn(apiClient, "deletePracticeSession")
        .mockResolvedValue(undefined);
      const onSessionDeleted = vi.fn();
      const onClose = vi.fn();

      render(
        <DeleteSessionModal
          session={mockSession}
          sessionIndex={2}
          isOpen={true}
          onClose={onClose}
          onSessionDeleted={onSessionDeleted}
        />,
      );

      expect(screen.getByText("Delete Session")).toBeDefined();
      expect(screen.getByText("Session 2")).toBeDefined();

      const deleteBtn = screen.getByRole("button", { name: /delete session/i });
      fireEvent.click(deleteBtn);

      await waitFor(() => {
        expect(deleteSpy).toHaveBeenCalledWith("sess-123");
        expect(onSessionDeleted).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
      });
    });

    it("displays error message if session deletion fails", async () => {
      vi.spyOn(apiClient, "deletePracticeSession").mockRejectedValue(
        new Error("Session cannot be deleted while active"),
      );

      render(
        <DeleteSessionModal
          session={mockSession}
          sessionIndex={1}
          isOpen={true}
          onClose={vi.fn()}
        />,
      );

      const deleteBtn = screen.getByRole("button", { name: /delete session/i });
      fireEvent.click(deleteBtn);

      expect(
        await screen.findByText("Session cannot be deleted while active"),
      ).toBeDefined();
    });
  });
});
