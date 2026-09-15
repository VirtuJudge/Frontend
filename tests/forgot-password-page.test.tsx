import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const resetPassword = vi.fn();
const verifyPasswordRecoveryOtp = vi.fn();
const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/features/auth", () => ({
  useAuth: () => ({ resetPassword, verifyPasswordRecoveryOtp }),
}));

import ForgotPasswordPage from "@/app/(public)/auth/forgot-password/page";

describe("forgot password page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetPassword.mockResolvedValue(undefined);
    verifyPasswordRecoveryOtp.mockResolvedValue(undefined);
  });

  it("shows an OTP form after requesting a password reset and verifies the code", async () => {
    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "recover@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send Reset Link" }));

    expect(await screen.findByLabelText("Reset code")).toBeDefined();

    fireEvent.change(screen.getByLabelText("Reset code"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Verify Code" }));

    await waitFor(() => {
      expect(verifyPasswordRecoveryOtp).toHaveBeenCalledWith(
        "recover@example.com",
        "123456",
      );
      expect(push).toHaveBeenCalledWith("/auth/reset-password");
    });
  });
});
