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

  it("shows an 8-digit OTP form after requesting a password reset and verifies the code", async () => {
    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "recover@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Send Reset (Code|Link)/i }));

    expect(
      await screen.findByRole("group", { name: "8-digit verification code" }),
    ).toBeDefined();

    for (let i = 1; i <= 8; i++) {
      expect(screen.getByLabelText(`Digit ${i}`)).toBeDefined();
    }

    for (let i = 1; i <= 8; i++) {
      fireEvent.change(screen.getByLabelText(`Digit ${i}`), {
        target: { value: `${i}` },
      });
    }

    fireEvent.click(screen.getByRole("button", { name: "Verify Code" }));

    await waitFor(() => {
      expect(verifyPasswordRecoveryOtp).toHaveBeenCalledWith(
        "recover@example.com",
        "12345678",
      );
      expect(push).toHaveBeenCalledWith("/auth/reset-password");
    });
  });

  it("supports pasting an 8-digit code", async () => {
    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "recover@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Send Reset (Code|Link)/i }));

    expect(
      await screen.findByRole("group", { name: "8-digit verification code" }),
    ).toBeDefined();

    const firstInput = screen.getByLabelText("Digit 1");
    fireEvent.paste(firstInput, {
      clipboardData: {
        getData: () => "87654321",
      },
    });

    for (let i = 1; i <= 8; i++) {
      const input = screen.getByLabelText(`Digit ${i}`) as HTMLInputElement;
      expect(input.value).toBe(String(9 - i));
    }

    fireEvent.click(screen.getByRole("button", { name: "Verify Code" }));

    await waitFor(() => {
      expect(verifyPasswordRecoveryOtp).toHaveBeenCalledWith(
        "recover@example.com",
        "87654321",
      );
      expect(push).toHaveBeenCalledWith("/auth/reset-password");
    });
  });

  it("handles backspace navigation between digit inputs", async () => {
    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "recover@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Send Reset (Code|Link)/i }));

    const digit1 = (await screen.findByLabelText("Digit 1")) as HTMLInputElement;
    const digit2 = screen.getByLabelText("Digit 2") as HTMLInputElement;

    fireEvent.change(digit1, { target: { value: "1" } });
    fireEvent.change(digit2, { target: { value: "2" } });
    expect(digit2.value).toBe("2");

    // Backspace clears current
    fireEvent.keyDown(digit2, { key: "Backspace" });
    expect(digit2.value).toBe("");

    // Backspace on empty clears previous
    fireEvent.keyDown(digit2, { key: "Backspace" });
    expect(digit1.value).toBe("");
  });

  it("allows resending the reset code with cooldown", async () => {
    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "recover@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Send Reset (Code|Link)/i }));

    expect(
      await screen.findByRole("group", { name: "8-digit verification code" }),
    ).toBeDefined();

    expect(screen.getByText(/Resend code in/i)).toBeDefined();
  });

  it("displays an error when verification fails", async () => {
    verifyPasswordRecoveryOtp.mockRejectedValueOnce(
      new Error("Invalid reset code"),
    );

    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "recover@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Send Reset (Code|Link)/i }));

    const firstInput = await screen.findByLabelText("Digit 1");
    fireEvent.paste(firstInput, {
      clipboardData: {
        getData: () => "11112222",
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "Verify Code" }));

    expect(await screen.findByText("Invalid reset code")).toBeDefined();
  });
});
