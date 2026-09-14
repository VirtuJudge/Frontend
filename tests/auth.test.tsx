import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  parseJwt,
  isJwtExpired,
  createSyntheticJwt,
} from "@/lib/auth/jwt";
import {
  getClientAuthToken,
  setClientAuthToken,
  removeClientAuthToken,
  syncSessionToCookies,
} from "@/lib/auth/cookies";
import { AuthProvider, useAuth, useOptionalAuth } from "@/features/auth";
import { isSupabaseConfigured } from "@/lib/auth/supabase";
import { MOCK_DATA } from "@/lib/api/client";

describe("JWT Utilities", () => {
  it("encodes and decodes synthetic JWT payloads accurately", () => {
    const payload = {
      sub: "user_123",
      email: "test@example.com",
      display_name: "Test User",
    };

    const token = createSyntheticJwt(payload, 3600);
    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3);

    const decoded = parseJwt(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.sub).toBe("user_123");
    expect(decoded?.email).toBe("test@example.com");
    expect(decoded?.display_name).toBe("Test User");
    expect(decoded?.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it("returns null when parsing malformed tokens", () => {
    expect(parseJwt("invalid-token")).toBeNull();
    expect(parseJwt("part1.part2")).toBeNull();
    expect(parseJwt("")).toBeNull();
  });

  it("accurately reports expired and non-expired tokens", () => {
    const futureToken = createSyntheticJwt({ sub: "user_1" }, 3600);
    expect(isJwtExpired(futureToken)).toBe(false);

    // Negative expiration delta -> expired in the past
    const pastToken = createSyntheticJwt({ sub: "user_2" }, -3600);
    expect(isJwtExpired(pastToken)).toBe(true);
  });
});

describe("Client Cookie Management", () => {
  beforeEach(() => {
    removeClientAuthToken();
  });

  it("sets, gets, and removes auth cookies", () => {
    expect(getClientAuthToken()).toBeNull();

    setClientAuthToken("jwt_test_cookie_123");
    expect(getClientAuthToken()).toBe("jwt_test_cookie_123");

    removeClientAuthToken();
    expect(getClientAuthToken()).toBeNull();
  });

  it("synchronizes session token to cookies and removes on null", () => {
    expect(getClientAuthToken()).toBeNull();

    syncSessionToCookies("valid_sync_token_456");
    expect(getClientAuthToken()).toBe("valid_sync_token_456");

    syncSessionToCookies(null);
    expect(getClientAuthToken()).toBeNull();
  });
});

function TestAuthConsumer() {
  const { user, isAuthenticated, signInWithMock, signOut } = useAuth();
  return (
    <div>
      <div data-testid="auth-state">
        {isAuthenticated ? "Authenticated" : "Unauthenticated"}
      </div>
      {user && <div data-testid="user-email">{user.email}</div>}
      <button
        type="button"
        onClick={async () => {
          await signInWithMock({ email: "custom@example.com", display_name: "Custom User" });
        }}
      >
        Sign In
      </button>
      <button
        type="button"
        onClick={async () => {
          await signOut();
        }}
      >
        Sign Out
      </button>
    </div>
  );
}

describe("AuthProvider and useAuth", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    removeClientAuthToken();
    MOCK_DATA.user.email = "alex@example.com";
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  it("handles sign in with synthetic JWT and sign out", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TestAuthConsumer />
        </AuthProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByTestId("auth-state").textContent).toBe("Unauthenticated");

    const signInBtn = screen.getByRole("button", { name: /sign in/i });
    await act(async () => {
      fireEvent.click(signInBtn);
    });

    const token = getClientAuthToken();
    expect(token).not.toBeNull();
    expect(token?.split(".").length).toBe(3);

    const signOutBtn = screen.getByRole("button", { name: /sign out/i });
    await act(async () => {
      fireEvent.click(signOutBtn);
    });

    expect(getClientAuthToken()).toBeNull();
    expect(screen.getByTestId("auth-state").textContent).toBe("Unauthenticated");
  });

  it("supports signOut with redirectTo: false without triggering default location assign", async () => {
    function SignOutNoRedirectConsumer() {
      const { signInWithMock, signOut, isAuthenticated } = useAuth();
      return (
        <div>
          <div data-testid="custom-auth-state">
            {isAuthenticated ? "Authenticated" : "Unauthenticated"}
          </div>
          <button
            type="button"
            onClick={async () => {
              await signInWithMock();
            }}
          >
            Sign In Test
          </button>
          <button
            type="button"
            onClick={async () => {
              await signOut({ redirectTo: false });
            }}
          >
            Sign Out Test
          </button>
        </div>
      );
    }

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SignOutNoRedirectConsumer />
        </AuthProvider>
      </QueryClientProvider>,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /sign in test/i }));
    });
    expect(getClientAuthToken()).not.toBeNull();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /sign out test/i }));
    });
    expect(getClientAuthToken()).toBeNull();
    expect(screen.getByTestId("custom-auth-state").textContent).toBe(
      "Unauthenticated",
    );
  });

  it("handles signInWithPassword and signUpWithPassword", async () => {
    function PasswordAuthConsumer() {
      const { user, isAuthenticated, signInWithPassword, signUpWithPassword } = useAuth();
      return (
        <div>
          <div data-testid="pwd-auth-state">
            {isAuthenticated ? "Authenticated" : "Unauthenticated"}
          </div>
          {user && <div data-testid="pwd-user-email">{user.email}</div>}
          <button
            type="button"
            onClick={async () => {
              await signUpWithPassword({
                email: "newuser@example.com",
                password: "password123",
                displayName: "New User",
              });
            }}
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={async () => {
              await signInWithPassword({
                email: "signin@example.com",
                password: "password123",
              });
            }}
          >
            Sign In Password
          </button>
        </div>
      );
    }

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <PasswordAuthConsumer />
        </AuthProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByTestId("pwd-auth-state").textContent).toBe("Unauthenticated");

    const signUpBtn = screen.getByRole("button", { name: /sign up/i });
    await act(async () => {
      fireEvent.click(signUpBtn);
    });

    expect(getClientAuthToken()).not.toBeNull();

    const signInPasswordBtn = screen.getByRole("button", { name: /sign in password/i });
    await act(async () => {
      fireEvent.click(signInPasswordBtn);
    });

    expect(getClientAuthToken()).not.toBeNull();
  });

  it("handles verifyRegistration enforcing 8 numbers and clearing tokens", async () => {
    let verifyFn: ((args: { email: string; otp: string }) => Promise<void>) | null = null;
    let resendFn: ((email: string) => Promise<void>) | null = null;

    function VerifyAuthConsumer({
      onReady,
    }: {
      onReady: (methods: {
        verify: (args: { email: string; otp: string }) => Promise<void>;
        resend: (email: string) => Promise<void>;
      }) => void;
    }) {
      const { verifyRegistration, resendVerificationOtp } = useAuth();
      React.useEffect(() => {
        onReady({ verify: verifyRegistration, resend: resendVerificationOtp });
      }, [verifyRegistration, resendVerificationOtp, onReady]);
      return <div data-testid="verify-consumer">Ready</div>;
    }

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <VerifyAuthConsumer
            onReady={({ verify, resend }) => {
              verifyFn = verify;
              resendFn = resend;
            }}
          />
        </AuthProvider>
      </QueryClientProvider>,
    );

    expect(verifyFn).not.toBeNull();
    expect(resendFn).not.toBeNull();

    // Reject non-8-digit OTPs
    await expect(
      verifyFn!({ email: "test@example.com", otp: "1234" }),
    ).rejects.toThrow(/8 numbers/i);

    await expect(
      verifyFn!({ email: "test@example.com", otp: "1234abcd" }),
    ).rejects.toThrow(/8 numbers/i);

    await expect(
      verifyFn!({ email: "", otp: "12345678" }),
    ).rejects.toThrow(/email is required/i);

    // Set a token first to verify it gets cleared upon verification
    setClientAuthToken("existing_token");
    expect(getClientAuthToken()).toBe("existing_token");

    // Valid 8-digit OTP
    await act(async () => {
      await verifyFn!({ email: "test@example.com", otp: "12345678" });
    });

    // Session is cleared so user redirects to login unauthenticated
    expect(getClientAuthToken()).toBeNull();

    // Resend with empty email throws
    await expect(resendFn!("")).rejects.toThrow(/email is required/i);

    // Resend with unregistered email throws
    await expect(resendFn!("nonexistent@example.com")).rejects.toThrow(
      /no registered account found/i,
    );

    // Resend with already verified email throws
    await expect(resendFn!("alex@example.com")).rejects.toThrow(
      /already verified/i,
    );

    // Resend with unconfirmed registered email succeeds in mock mode
    await expect(resendFn!("resend@example.com")).resolves.toBeUndefined();
  });

  it("returns null when useOptionalAuth is used outside of AuthProvider", () => {
    function OptionalConsumer() {
      const auth = useOptionalAuth();
      return <div data-testid="opt-auth">{auth === null ? "null" : "defined"}</div>;
    }

    render(<OptionalConsumer />);
    expect(screen.getByTestId("opt-auth").textContent).toBe("null");
  });

  it("evaluates isSupabaseConfigured correctly based on environment", () => {
    expect(typeof isSupabaseConfigured()).toBe("boolean");
  });
});
