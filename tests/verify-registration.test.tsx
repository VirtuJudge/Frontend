import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import VerifyRegistrationPage from "@/app/(public)/auth/verify-registration/page";
import { AuthProvider } from "@/features/auth";
import * as navigation from "next/navigation";

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

describe("VerifyRegistrationPage", () => {
  const replaceMock = vi.fn();
  const pushMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(navigation, "useRouter").mockReturnValue({
      replace: replaceMock,
      push: pushMock,
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    } as unknown as ReturnType<typeof navigation.useRouter>);
    vi.spyOn(navigation, "useSearchParams").mockReturnValue(
      new URLSearchParams() as unknown as ReturnType<typeof navigation.useSearchParams>,
    );
  });

  it("renders the verification header and 8 OTP inputs", () => {
    renderWithProviders(<VerifyRegistrationPage />);

    expect(
      screen.getByText("Verify your registration", { exact: true }),
    ).toBeDefined();
    expect(
      screen.getByText(/please enter the 8-digit otp/i),
    ).toBeDefined();

    // Verify all 8 digit inputs exist
    for (let i = 1; i <= 8; i++) {
      expect(screen.getByLabelText(`Digit ${i}`)).toBeDefined();
    }

    // Verify the email input and verify button
    expect(screen.getByPlaceholderText(/enter your email address/i)).toBeDefined();
    expect(
      screen.getByRole("button", { name: /verify registration/i }),
    ).toBeDefined();
  });

  it("pre-fills email when present in search parameters", () => {
    vi.spyOn(navigation, "useSearchParams").mockReturnValue(
      new URLSearchParams({ email: "user@example.com" }) as unknown as ReturnType<
        typeof navigation.useSearchParams
      >,
    );

    renderWithProviders(<VerifyRegistrationPage />);

    const emailInput = screen.getByPlaceholderText(
      /enter your email address/i,
    ) as HTMLInputElement;
    expect(emailInput.value).toBe("user@example.com");
  });

  it("allows entering digits and ignores non-numeric characters", () => {
    renderWithProviders(<VerifyRegistrationPage />);

    const digit1 = screen.getByLabelText("Digit 1") as HTMLInputElement;
    const digit2 = screen.getByLabelText("Digit 2") as HTMLInputElement;

    // Typing non-numeric character should not set digit
    fireEvent.change(digit1, { target: { value: "a" } });
    expect(digit1.value).toBe("");

    // Typing numeric character sets digit
    fireEvent.change(digit1, { target: { value: "4" } });
    expect(digit1.value).toBe("4");

    fireEvent.change(digit2, { target: { value: "7" } });
    expect(digit2.value).toBe("7");
  });

  it("handles backspace key correctly", () => {
    renderWithProviders(<VerifyRegistrationPage />);

    const digit1 = screen.getByLabelText("Digit 1") as HTMLInputElement;
    const digit2 = screen.getByLabelText("Digit 2") as HTMLInputElement;

    fireEvent.change(digit1, { target: { value: "1" } });
    fireEvent.change(digit2, { target: { value: "2" } });
    expect(digit2.value).toBe("2");

    // Backspace on filled input clears it
    fireEvent.keyDown(digit2, { key: "Backspace" });
    expect(digit2.value).toBe("");

    // Backspace on empty input clears previous input
    fireEvent.keyDown(digit2, { key: "Backspace" });
    expect(digit1.value).toBe("");
  });

  it("handles pasting an 8-digit verification code across all slots", () => {
    renderWithProviders(<VerifyRegistrationPage />);

    const digit1 = screen.getByLabelText("Digit 1") as HTMLInputElement;

    fireEvent.paste(digit1, {
      clipboardData: {
        getData: () => "87654321",
      },
    });

    for (let i = 1; i <= 8; i++) {
      const input = screen.getByLabelText(`Digit ${i}`) as HTMLInputElement;
      expect(input.value).toBe(String("87654321"[i - 1]));
    }
  });

  it("submitting 8 numbers successfully redirects to /auth/login with verified status", async () => {
    vi.spyOn(navigation, "useSearchParams").mockReturnValue(
      new URLSearchParams({
        email: "successful@example.com",
      }) as unknown as ReturnType<typeof navigation.useSearchParams>,
    );

    renderWithProviders(<VerifyRegistrationPage />);

    const digit1 = screen.getByLabelText("Digit 1");
    fireEvent.paste(digit1, {
      clipboardData: {
        getData: () => "12345678",
      },
    });

    const verifyButton = screen.getByRole("button", {
      name: /verify registration/i,
    });
    expect(verifyButton).not.toHaveProperty("disabled", true);

    await act(async () => {
      fireEvent.click(verifyButton);
    });

    expect(replaceMock).toHaveBeenCalledWith(
      "/auth/login?verified=true&email=successful%40example.com",
    );
  });

  it("shows error when email is cleared before submitting", async () => {
    renderWithProviders(<VerifyRegistrationPage />);

    const digit1 = screen.getByLabelText("Digit 1");
    fireEvent.paste(digit1, {
      clipboardData: {
        getData: () => "12345678",
      },
    });

    const emailInput = screen.getByPlaceholderText(
      /enter your email address/i,
    );
    fireEvent.change(emailInput, { target: { value: "" } });

    const form = emailInput.closest("form")!;
    await act(async () => {
      fireEvent.submit(form);
    });

    expect(screen.getByRole("alert").textContent).toMatch(
      /please enter your email address/i,
    );
  });

  it("handles resend verification code", async () => {
    vi.spyOn(navigation, "useSearchParams").mockReturnValue(
      new URLSearchParams({
        email: "resend@example.com",
      }) as unknown as ReturnType<typeof navigation.useSearchParams>,
    );

    renderWithProviders(<VerifyRegistrationPage />);

    const resendButton = screen.getByRole("button", {
      name: /resend verification code/i,
    });

    await act(async () => {
      fireEvent.click(resendButton);
    });

    expect(screen.getByRole("status").textContent).toMatch(
      /new 8-digit verification code has been sent/i,
    );
  });

  it("displays error when writing a non-registered email upon blur or debounce", async () => {
    renderWithProviders(<VerifyRegistrationPage />);

    const emailInput = screen.getByPlaceholderText(
      /enter your email address/i,
    );

    await act(async () => {
      fireEvent.change(emailInput, {
        target: { value: "not_registered_user@example.com" },
      });
      fireEvent.blur(emailInput);
    });

    expect(screen.getByRole("alert").textContent).toMatch(
      /no registered account found with this email/i,
    );
  });

  it("displays error when entering an already verified email upon blur", async () => {
    renderWithProviders(<VerifyRegistrationPage />);

    const emailInput = screen.getByPlaceholderText(
      /enter your email address/i,
    );

    await act(async () => {
      fireEvent.change(emailInput, {
        target: { value: "alex@example.com" },
      });
      fireEvent.blur(emailInput);
    });

    expect(screen.getByRole("alert").textContent).toMatch(
      /this email is already verified/i,
    );
  });

  it("blocks resending verification code for non-registered users", async () => {
    renderWithProviders(<VerifyRegistrationPage />);

    const emailInput = screen.getByPlaceholderText(
      /enter your email address/i,
    );
    const resendButton = screen.getByRole("button", {
      name: /resend verification code/i,
    });

    await act(async () => {
      fireEvent.change(emailInput, {
        target: { value: "ghost@example.com" },
      });
      fireEvent.click(resendButton);
    });

    expect(screen.getByRole("alert").textContent).toMatch(
      /no registered account found with this email/i,
    );
  });

  it("has accessible link to login page", () => {
    renderWithProviders(<VerifyRegistrationPage />);

    const loginLink = screen.getByRole("link", { name: /log in here!/i });
    expect(loginLink.getAttribute("href")).toBe("/auth/login");
  });
});
