import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const replace = vi.fn();
const signOut = vi.fn().mockResolvedValue(undefined);
const updateUser = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

vi.mock("@/features/auth", () => ({
  useAuth: () => ({ signOut }),
}));

vi.mock("@/lib/auth/supabase", () => ({
  getSupabaseClient: () => ({ auth: { updateUser } }),
}));

import ResetPasswordPage from "@/app/(public)/auth/reset-password/page";

describe("reset password page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateUser.mockResolvedValue({ error: null });
  });

  it("updates the password through the authenticated Supabase recovery session", async () => {
    render(<ResetPasswordPage />);

    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "new-password" },
    });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "new-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update Password" }));

    await waitFor(() => {
      expect(updateUser).toHaveBeenCalledWith({ password: "new-password" });
      expect(signOut).toHaveBeenCalledWith({ redirectTo: false });
      expect(replace).toHaveBeenCalledWith("/auth/login?passwordReset=success");
    });
  });

  it("does not submit passwords that do not match", () => {
    render(<ResetPasswordPage />);

    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "new-password" },
    });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "different-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update Password" }));

    expect(updateUser).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain("Passwords do not match.");
  });
});
