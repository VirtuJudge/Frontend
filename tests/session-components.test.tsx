import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  SessionConfirmationModal,
  SessionControlPill,
  SessionTimerBadge,
  SessionHeader,
} from "@/features/session";

describe("Session Modular Components", () => {
  describe("SessionConfirmationModal", () => {
    it("renders when isOpen is true and triggers onConfirm and onCancel", () => {
      const onConfirm = vi.fn();
      const onCancel = vi.fn();

      const { rerender } = render(
        <SessionConfirmationModal
          isOpen={false}
          title="End session?"
          description="Any data will be lost"
          confirmLabel="End"
          onConfirm={onConfirm}
          onCancel={onCancel}
        />,
      );

      expect(screen.queryByText("End session?")).toBeNull();

      rerender(
        <SessionConfirmationModal
          isOpen={true}
          title="End session?"
          description="Any data will be lost"
          confirmLabel="End"
          onConfirm={onConfirm}
          onCancel={onCancel}
        />,
      );

      expect(screen.getByText("End session?")).toBeDefined();
      expect(screen.getByText("Any data will be lost")).toBeDefined();

      const confirmBtn = screen.getByRole("button", { name: "End" });
      fireEvent.click(confirmBtn);
      expect(onConfirm).toHaveBeenCalledTimes(1);

      const cancelBtn = screen.getByRole("button", {
        name: "Back to the session",
      });
      fireEvent.click(cancelBtn);
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe("SessionControlPill", () => {
    it("handles pause and end callbacks", () => {
      const onTogglePause = vi.fn();
      const onEnd = vi.fn();

      const { rerender } = render(
        <SessionControlPill
          allowPauses={true}
          isPaused={false}
          onTogglePause={onTogglePause}
          onEnd={onEnd}
        />,
      );

      const pauseBtn = screen.getByRole("button", { name: "Pause recording" });
      fireEvent.click(pauseBtn);
      expect(onTogglePause).toHaveBeenCalledTimes(1);

      rerender(
        <SessionControlPill
          allowPauses={true}
          isPaused={true}
          onTogglePause={onTogglePause}
          onEnd={onEnd}
        />,
      );

      const resumeBtn = screen.getByRole("button", {
        name: "Resume recording",
      });
      fireEvent.click(resumeBtn);
      expect(onTogglePause).toHaveBeenCalledTimes(2);

      const endBtn = screen.getByRole("button", { name: "End session" });
      fireEvent.click(endBtn);
      expect(onEnd).toHaveBeenCalledTimes(1);
    });

    it("hides pause button when allowPauses is false", () => {
      render(
        <SessionControlPill
          allowPauses={false}
          isPaused={false}
          onTogglePause={vi.fn()}
          onEnd={vi.fn()}
        />,
      );

      expect(screen.queryByRole("button", { name: "Pause recording" })).toBeNull();
      expect(screen.getByRole("button", { name: "End session" })).toBeDefined();
    });
  });

  describe("SessionTimerBadge", () => {
    it("displays formatted time when showTimer is true", () => {
      const { rerender } = render(
        <SessionTimerBadge showTimer={true} formattedTime="05:30" />,
      );

      expect(screen.getByText("05:30")).toBeDefined();

      rerender(<SessionTimerBadge showTimer={false} formattedTime="05:30" />);
      expect(screen.queryByText("05:30")).toBeNull();
    });
  });

  describe("SessionHeader", () => {
    it("renders VirtuJudge logo and triggers onNavigate", () => {
      const onNavigate = vi.fn();
      render(<SessionHeader onNavigate={onNavigate} />);

      const logo = screen.getByAltText("VirtuJudge");
      expect(logo).toBeDefined();

      const link = logo.closest("a");
      expect(link).not.toBeNull();
      fireEvent.click(link!);
      expect(onNavigate).toHaveBeenCalledTimes(1);
    });
  });
});
