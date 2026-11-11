import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  DeleteAssetModal,
  DeleteSessionModal,
  DeleteProjectModal,
} from "@/features/projects";
import { apiClient } from "@/lib/api/client";
import { Asset, PracticeSession, Project } from "@/lib/api/types";

describe("Deletion Modals", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("DeleteAssetModal", () => {
    const mockAsset: Asset = {
      id: "asset-1",
      project_id: "project-1",
      kind: "supporting_document",
      file_name: "deck.pdf",
      media_type: "application/pdf",
      size_bytes: 1024,
      state: "verified",
      created_at: "2026-09-17T00:00:00Z",
    };

    it("renders asset name and triggers deleteAsset on confirm", async () => {
      const deleteSpy = vi.spyOn(apiClient, "deleteAsset").mockResolvedValue();
      const onDeleted = vi.fn();
      const onClose = vi.fn();

      render(
        <DeleteAssetModal
          asset={mockAsset}
          isOpen={true}
          onClose={onClose}
          onAssetDeleted={onDeleted}
        />,
      );

      expect(screen.getByText("deck.pdf")).toBeDefined();
      const deleteBtn = screen.getByRole("button", { name: "Delete" });
      fireEvent.click(deleteBtn);

      await waitFor(() => {
        expect(deleteSpy).toHaveBeenCalledWith("asset-1");
        expect(onDeleted).toHaveBeenCalledTimes(1);
        expect(onClose).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("DeleteSessionModal", () => {
    const mockSession: PracticeSession = {
      id: "sess-1",
      project_id: "project-1",
      created_by: "user-1",
      status: "ready",
      state: "ready",
      version: 1,
      created_at: "2026-09-17T00:00:00Z",
      updated_at: "2026-09-17T00:00:00Z",
    };

    it("renders session index and triggers deletePracticeSession on confirm", async () => {
      const deleteSpy = vi
        .spyOn(apiClient, "deletePracticeSession")
        .mockResolvedValue();
      const onDeleted = vi.fn();
      const onClose = vi.fn();

      render(
        <DeleteSessionModal
          session={mockSession}
          sessionIndex={2}
          isOpen={true}
          onClose={onClose}
          onSessionDeleted={onDeleted}
        />,
      );

      expect(screen.getByText("Session 2")).toBeDefined();
      const deleteBtn = screen.getByRole("button", { name: /Delete Session/i });
      fireEvent.click(deleteBtn);

      await waitFor(() => {
        expect(deleteSpy).toHaveBeenCalledWith("sess-1", expect.any(String));
        expect(onDeleted).toHaveBeenCalledTimes(1);
        expect(onClose).toHaveBeenCalledTimes(1);
      });
    });

    it("retains the same idempotency key when retrying after a failed deletion", async () => {
      const deleteSpy = vi
        .spyOn(apiClient, "deletePracticeSession")
        .mockRejectedValueOnce(new Error("Network timeout"))
        .mockResolvedValueOnce();
      const onDeleted = vi.fn();
      const onClose = vi.fn();

      render(
        <DeleteSessionModal
          session={mockSession}
          sessionIndex={2}
          isOpen={true}
          onClose={onClose}
          onSessionDeleted={onDeleted}
        />,
      );

      const deleteBtn = screen.getByRole("button", { name: /Delete Session/i });
      fireEvent.click(deleteBtn);

      await waitFor(() => {
        expect(deleteSpy).toHaveBeenCalledTimes(1);
      });

      expect(screen.getByText("Network timeout")).toBeDefined();

      fireEvent.click(deleteBtn);

      await waitFor(() => {
        expect(deleteSpy).toHaveBeenCalledTimes(2);
        expect(onDeleted).toHaveBeenCalledTimes(1);
        expect(onClose).toHaveBeenCalledTimes(1);
      });

      const firstKey = deleteSpy.mock.calls[0][1];
      const secondKey = deleteSpy.mock.calls[1][1];
      expect(firstKey).toBeDefined();
      expect(firstKey).toBe(secondKey);
    });
  });

  describe("DeleteProjectModal", () => {
    const mockProject: Project = {
      id: "proj-1",
      team_id: "team-1",
      name: "Acme Pitch",
      description: "Pitch deck",
      created_by: "user-1",
      version: 1,
      created_at: "2026-09-17T00:00:00Z",
    };

    it("requires exact confirmation before allowing deletion", async () => {
      const deleteSpy = vi
        .spyOn(apiClient, "deleteProject")
        .mockResolvedValue();
      const onDeleted = vi.fn();
      const onClose = vi.fn();

      render(
        <DeleteProjectModal
          project={mockProject}
          isOpen={true}
          onClose={onClose}
          onProjectDeleted={onDeleted}
        />,
      );

      const deleteBtn = screen.getByRole("button", { name: /Delete Project/i });
      expect(deleteBtn.hasAttribute("disabled")).toBe(true);

      const input = screen.getByLabelText("Confirm project name");
      fireEvent.change(input, { target: { value: "Wrong Name" } });
      expect(deleteBtn.hasAttribute("disabled")).toBe(true);

      fireEvent.change(input, { target: { value: "Acme Pitch" } });
      expect(deleteBtn.hasAttribute("disabled")).toBe(false);

      fireEvent.click(deleteBtn);
      await waitFor(() => {
        expect(deleteSpy).toHaveBeenCalledWith("proj-1", "Acme Pitch", expect.any(String));
        expect(onDeleted).toHaveBeenCalledTimes(1);
        expect(onClose).toHaveBeenCalledTimes(1);
      });
    });

    it("retains the same idempotency key when retrying after a failed project deletion", async () => {
      const deleteSpy = vi
        .spyOn(apiClient, "deleteProject")
        .mockRejectedValueOnce(new Error("Server unavailable"))
        .mockResolvedValueOnce();
      const onDeleted = vi.fn();
      const onClose = vi.fn();

      render(
        <DeleteProjectModal
          project={mockProject}
          isOpen={true}
          onClose={onClose}
          onProjectDeleted={onDeleted}
        />,
      );

      const input = screen.getByLabelText("Confirm project name");
      fireEvent.change(input, { target: { value: "Acme Pitch" } });

      const deleteBtn = screen.getByRole("button", { name: /Delete Project/i });
      fireEvent.click(deleteBtn);

      await waitFor(() => {
        expect(deleteSpy).toHaveBeenCalledTimes(1);
      });

      expect(screen.getByText("Server unavailable")).toBeDefined();

      fireEvent.click(deleteBtn);

      await waitFor(() => {
        expect(deleteSpy).toHaveBeenCalledTimes(2);
        expect(onDeleted).toHaveBeenCalledTimes(1);
        expect(onClose).toHaveBeenCalledTimes(1);
      });

      const firstKey = deleteSpy.mock.calls[0][2];
      const secondKey = deleteSpy.mock.calls[1][2];
      expect(firstKey).toBeDefined();
      expect(firstKey).toBe(secondKey);
    });
  });
});
