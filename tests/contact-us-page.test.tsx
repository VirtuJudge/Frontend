import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { SupabaseClient } from "@supabase/supabase-js";
import ContactsPage from "@/app/(public)/company/contact-us/page";
import * as supabaseModule from "@/lib/auth/supabase";
import * as authModule from "@/features/auth";

vi.mock("@/features/auth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/lib/auth/supabase", () => ({
  isSupabaseConfigured: vi.fn(),
  getSupabaseClient: vi.fn(),
}));

describe("ContactsPage", () => {
  const mockInsert = vi.fn();
  const mockFrom = vi.fn(() => ({
    insert: mockInsert,
  }));
  const mockSupabase = {
    from: mockFrom,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authModule.useAuth).mockReturnValue({
      user: null,
      token: null,
      decodedToken: null,
      isAuthenticated: false,
      isLoading: false,
      isSupabaseAvailable: true,
      signInWithPassword: vi.fn(),
      signUpWithPassword: vi.fn(),
      verifyRegistration: vi.fn(),
      resendVerificationOtp: vi.fn(),
      checkEmailVerificationStatus: vi.fn(),
      resetPassword: vi.fn(),
      verifyPasswordRecoveryOtp: vi.fn(),
      signInWithJwt: vi.fn(),
      signOut: vi.fn(),
      refreshUser: vi.fn(),
    });
    vi.mocked(supabaseModule.isSupabaseConfigured).mockReturnValue(true);
    vi.mocked(supabaseModule.getSupabaseClient).mockReturnValue(
      mockSupabase as unknown as SupabaseClient,
    );
    mockInsert.mockResolvedValue({ error: null });
  });

  it("renders form inputs and submit button", () => {
    render(<ContactsPage />);

    expect(screen.getByRole("heading", { name: "Contact Us" })).toBeDefined();
    expect(screen.getByLabelText("Name")).toBeDefined();
    expect(screen.getByLabelText("Email")).toBeDefined();
    expect(screen.getByLabelText("Phone")).toBeDefined();
    expect(screen.getByLabelText("Message")).toBeDefined();
    expect(screen.getByRole("button", { name: "Send Message" })).toBeDefined();
  });

  it("pre-fills name and email when an authenticated user is present", () => {
    vi.mocked(authModule.useAuth).mockReturnValue({
      user: {
        id: "user-123",
        email: "alice@example.com",
        display_name: "Alice Founder",
        created_at: "2026-09-01T00:00:00Z",
      },
      token: "mock-token",
      decodedToken: null,
      isAuthenticated: true,
      isLoading: false,
      isSupabaseAvailable: true,
      signInWithPassword: vi.fn(),
      signUpWithPassword: vi.fn(),
      verifyRegistration: vi.fn(),
      resendVerificationOtp: vi.fn(),
      checkEmailVerificationStatus: vi.fn(),
      resetPassword: vi.fn(),
      verifyPasswordRecoveryOtp: vi.fn(),
      signInWithJwt: vi.fn(),
      signOut: vi.fn(),
      refreshUser: vi.fn(),
    });

    render(<ContactsPage />);

    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("Alice Founder");
    expect((screen.getByLabelText("Email") as HTMLInputElement).value).toBe("alice@example.com");
  });

  it("validates fields before submitting", async () => {
    render(<ContactsPage />);

    fireEvent.click(screen.getByRole("button", { name: "Send Message" }));

    expect(await screen.findByText(/Please enter your name/i)).toBeDefined();
    expect(mockInsert).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "John" } });
    fireEvent.click(screen.getByRole("button", { name: "Send Message" }));

    expect(await screen.findByText(/Please enter a valid email address/i)).toBeDefined();
    expect(mockInsert).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "john@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send Message" }));

    expect(await screen.findByText(/Please enter a message/i)).toBeDefined();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("submits contact submission payload to Supabase successfully", async () => {
    render(<ContactsPage />);

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Jane Doe" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "jane@example.com" } });
    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "+1234567890" } });
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Hello, I have a question about VirtuJudge." } });

    fireEvent.click(screen.getByRole("button", { name: "Send Message" }));

    expect(
      await screen.findByText(/Your message has been sent successfully/i),
    ).toBeDefined();

    expect(mockFrom).toHaveBeenCalledWith("contact_submissions");
    expect(mockInsert).toHaveBeenCalledWith([
      {
        name: "Jane Doe",
        email: "jane@example.com",
        phone: "+1234567890",
        message: "Hello, I have a question about VirtuJudge.",
        user_id: null,
      },
    ]);
  });

  it("handles submission error from Supabase", async () => {
    mockInsert.mockResolvedValueOnce({
      error: { message: "Database connection failed" },
    });

    render(<ContactsPage />);

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Jane Doe" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "jane@example.com" } });
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Testing error scenario." } });

    fireEvent.click(screen.getByRole("button", { name: "Send Message" }));

    expect(await screen.findByText("Database connection failed")).toBeDefined();
  });

  it("shows unavailable message when Supabase is not configured", async () => {
    vi.mocked(supabaseModule.isSupabaseConfigured).mockReturnValue(false);
    vi.mocked(supabaseModule.getSupabaseClient).mockReturnValue(null);

    render(<ContactsPage />);

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Jane Doe" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "jane@example.com" } });
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Testing unconfigured Supabase." } });

    fireEvent.click(screen.getByRole("button", { name: "Send Message" }));

    expect(await screen.findByText(/Contact service is currently unavailable/i)).toBeDefined();
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
