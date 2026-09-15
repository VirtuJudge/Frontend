import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";

const replace = vi.fn();
const signInWithJwt = vi.fn().mockResolvedValue(undefined);
const exchangeCodeForSession = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams("code=recovery-code&type=recovery"),
}));

vi.mock("@/features/auth", () => ({
  useAuth: () => ({ signInWithJwt }),
}));

vi.mock("@/lib/auth/supabase", () => ({
  getSupabaseClient: () => ({
    auth: { exchangeCodeForSession, getSession: vi.fn() },
  }),
}));

vi.mock("@/lib/auth/cookies", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/cookies")>()),
  syncSessionToCookies: vi.fn(),
}));

import AuthCallbackPage from "@/app/(public)/auth/callback/page";

describe("password recovery callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    exchangeCodeForSession.mockResolvedValue({
      data: { session: { access_token: "recovery-token" } },
      error: null,
    });
  });

  it("routes recovery links to the page that collects a new password", async () => {
    render(<AuthCallbackPage />);

    await waitFor(() => {
      expect(exchangeCodeForSession).toHaveBeenCalledWith("recovery-code");
      expect(signInWithJwt).toHaveBeenCalledWith("recovery-token");
      expect(replace).toHaveBeenCalledWith("/auth/reset-password");
    });
  });
});
