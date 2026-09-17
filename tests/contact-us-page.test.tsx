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
  const mockGetUser = vi.fn();
  const mockSupabase = {
    from: mockFrom,
    auth: {
      getUser: mockGetUser,
    },
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
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
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

  it("sets user_id from Supabase auth user when authenticated in Supabase", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "supabase-auth-uuid-999" } },
      error: null,
    });

    render(<ContactsPage />);

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Jane Doe" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "jane@example.com" } });
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Hello with auth." } });

    fireEvent.click(screen.getByRole("button", { name: "Send Message" }));

    expect(
      await screen.findByText(/Your message has been sent successfully/i),
    ).toBeDefined();

    expect(mockInsert).toHaveBeenCalledWith([
      {
        name: "Jane Doe",
        email: "jane@example.com",
        phone: null,
        message: "Hello with auth.",
        user_id: "supabase-auth-uuid-999",
      },
    ]);
  });

  it("does not pass backend user id to Supabase when not logged into Supabase auth", async () => {
    vi.mocked(authModule.useAuth).mockReturnValue({
      user: {
        id: "backend-uuid-1234-5678",
        email: "alice@example.com",
        display_name: "Alice Founder",
        created_at: "2026-09-01T00:00:00Z",
      },
      token: "backend-token",
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
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    render(<ContactsPage />);

    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Message from backend user." } });
    fireEvent.click(screen.getByRole("button", { name: "Send Message" }));

    expect(
      await screen.findByText(/Your message has been sent successfully/i),
    ).toBeDefined();

    expect(mockInsert).toHaveBeenCalledWith([
      {
        name: "Alice Founder",
        email: "alice@example.com",
        phone: null,
        message: "Message from backend user.",
        user_id: null,
      },
    ]);
  });

  it("recovers and successfully submits when foreign key constraint violation occurs", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "stale-auth-user-id" } },
      error: null,
    });

    // First attempt fails with FK error, retry with user_id: null succeeds
    mockInsert
      .mockResolvedValueOnce({
        error: {
          code: "23503",
          message: 'insert or update on table "contact_submissions" violates foreign key constraint "contact_submissions_user_id_fkey"',
        },
      })
      .mockResolvedValueOnce({
        error: null,
      });

    render(<ContactsPage />);

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Jane Doe" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "jane@example.com" } });
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Message testing FK recovery." } });

    fireEvent.click(screen.getByRole("button", { name: "Send Message" }));

    expect(
      await screen.findByText(/Your message has been sent successfully/i),
    ).toBeDefined();

    expect(mockInsert).toHaveBeenCalledTimes(2);
    // First call attempted with stale-auth-user-id
    expect(mockInsert).toHaveBeenNthCalledWith(1, [
      {
        name: "Jane Doe",
        email: "jane@example.com",
        phone: null,
        message: "Message testing FK recovery.",
        user_id: "stale-auth-user-id",
      },
    ]);
    // Second call retried with null user_id
    expect(mockInsert).toHaveBeenNthCalledWith(2, [
      {
        name: "Jane Doe",
        email: "jane@example.com",
        phone: null,
        message: "Message testing FK recovery.",
        user_id: null,
      },
    ]);
  });
});
