import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RegisterPage from "@/app/(public)/auth/register/page";
import { AuthProvider } from "@/features/auth";
import * as navigation from "next/navigation";
import { getSupabaseClient } from "@/lib/auth/supabase";

vi.mock("@/lib/auth/supabase", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/supabase")>(
    "@/lib/auth/supabase",
  );
  return {
    ...actual,
    getSupabaseClient: vi.fn(),
  };
});

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

describe("RegisterPage - Agreement Radio Buttons & Password Reveal Logic", () => {
  const replaceMock = vi.fn();
  const pushMock = vi.fn();
  const signUpMock = vi.fn();
  const rpcMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    signUpMock.mockResolvedValue({
      data: {
        session: null,
      },
      error: null,
    });

    rpcMock.mockResolvedValue({
      data: { exists: false, waiting_confirmation: false, is_confirmed: false },
      error: null,
    });

    vi.mocked(getSupabaseClient).mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
        signUp: signUpMock,
      },
      rpc: rpcMock,
    } as unknown as ReturnType<typeof getSupabaseClient>);

    vi.spyOn(navigation, "useRouter").mockReturnValue({
      replace: replaceMock,
      push: pushMock,
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    } as unknown as ReturnType<typeof navigation.useRouter>);
  });

  it("renders both radio buttons unchecked initially", () => {
    renderWithProviders(<RegisterPage />);

    const termsRadio = screen.getByLabelText(
      /i agree to virtujudge's terms and conditions/i,
    ) as HTMLInputElement;
    const privacyRadio = screen.getByLabelText(
      /i agree to virtujudge's data privacy policy/i,
    ) as HTMLInputElement;

    expect(termsRadio).toBeDefined();
    expect(termsRadio.checked).toBe(false);
    expect(privacyRadio).toBeDefined();
    expect(privacyRadio.checked).toBe(false);
  });

  it("allows toggling approval by clicking the radio buttons", () => {
    renderWithProviders(<RegisterPage />);

    const termsRadio = screen.getByLabelText(
      /i agree to virtujudge's terms and conditions/i,
    ) as HTMLInputElement;
    const privacyRadio = screen.getByLabelText(
      /i agree to virtujudge's data privacy policy/i,
    ) as HTMLInputElement;

    // Click to check
    fireEvent.click(termsRadio);
    expect(termsRadio.checked).toBe(true);

    // Click again to uncheck
    fireEvent.click(termsRadio);
    expect(termsRadio.checked).toBe(false);

    // Check privacy
    fireEvent.click(privacyRadio);
    expect(privacyRadio.checked).toBe(true);
  });

  it("keeps the register button disabled until both radio buttons are approved", () => {
    renderWithProviders(<RegisterPage />);

    fireEvent.change(screen.getByPlaceholderText(/enter your email/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/^enter your password/i), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByPlaceholderText(/confirm your password/i), {
      target: { value: "password123" },
    });

    const termsRadio = screen.getByLabelText(
      /i agree to virtujudge's terms and conditions/i,
    );
    const privacyRadio = screen.getByLabelText(
      /i agree to virtujudge's data privacy policy/i,
    );

    // Both unchecked -> disabled
    expect(screen.getByRole("button", { name: /^register$/i }).hasAttribute("disabled")).toBe(true);

    // Only terms approved -> disabled
    fireEvent.click(termsRadio);
    expect(screen.getByRole("button", { name: /^register$/i }).hasAttribute("disabled")).toBe(true);

    // Both approved -> enabled
    fireEvent.click(privacyRadio);
    expect(screen.getByRole("button", { name: /^register$/i }).hasAttribute("disabled")).toBe(false);

    // Uncheck terms -> disabled
    fireEvent.click(termsRadio);
    expect(screen.getByRole("button", { name: /^register$/i }).hasAttribute("disabled")).toBe(true);
  });

  it("allows registration when both radio buttons are approved", async () => {
    renderWithProviders(<RegisterPage />);

    fireEvent.change(screen.getByPlaceholderText(/enter your email/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/enter your display name/i), {
      target: { value: "Test User" },
    });
    fireEvent.change(screen.getByPlaceholderText(/^enter your password/i), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByPlaceholderText(/confirm your password/i), {
      target: { value: "password123" },
    });

    const termsRadio = screen.getByLabelText(
      /i agree to virtujudge's terms and conditions/i,
    );
    const privacyRadio = screen.getByLabelText(
      /i agree to virtujudge's data privacy policy/i,
    );

    fireEvent.click(termsRadio);
    fireEvent.click(privacyRadio);

    const submitBtn = screen.getByRole("button", { name: /^register$/i });
    expect(submitBtn.hasAttribute("disabled")).toBe(false);

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(signUpMock).toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith(
      "/auth/verify-registration?email=test%40example.com",
    );
  });

  it("provides independent password reveal toggles for Password and Confirm Password inputs", () => {
    renderWithProviders(<RegisterPage />);

    const passwordInput = screen.getByPlaceholderText(
      /^enter your password/i,
    ) as HTMLInputElement;
    const confirmPasswordInput = screen.getByPlaceholderText(
      /confirm your password/i,
    ) as HTMLInputElement;

    const toggleButtons = screen.getAllByTestId("password-toggle");
    expect(toggleButtons).toHaveLength(2);

    const [pwdToggle, confirmPwdToggle] = toggleButtons;

    // Both initially password type
    expect(passwordInput.type).toBe("password");
    expect(confirmPasswordInput.type).toBe("password");

    // Toggle Password reveal only
    fireEvent.click(pwdToggle);
    expect(passwordInput.type).toBe("text");
    expect(confirmPasswordInput.type).toBe("password");

    // Toggle Confirm Password reveal
    fireEvent.click(confirmPwdToggle);
    expect(passwordInput.type).toBe("text");
    expect(confirmPasswordInput.type).toBe("text");

    // Hide Password again
    fireEvent.click(pwdToggle);
    expect(passwordInput.type).toBe("password");
    expect(confirmPasswordInput.type).toBe("text");
  });
});
