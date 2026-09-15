"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useSyncExternalStore,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { User } from "@/lib/api/types";
import { apiClient } from "@/lib/api/client";
import {
  getClientAuthToken,
  setClientAuthToken,
  removeClientAuthToken,
  syncSessionToCookies,
} from "@/lib/auth/cookies";
import {
  parseJwt,
  isJwtExpired,
  DecodedJwt,
} from "@/lib/auth/jwt";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/auth/supabase";

export interface SignInPasswordArgs {
  email: string;
  password: string;
}

export interface SignUpPasswordArgs {
  email: string;
  password: string;
  displayName?: string;
}

export interface VerifyRegistrationArgs {
  email: string;
  otp: string;
}

export interface VerificationStatus {
  exists: boolean;
  waitingConfirmation: boolean;
  isConfirmed: boolean;
}

export interface SignOutOptions {
  redirectTo?: string | false;
}

export interface AuthContextValue {
  user: User | null;
  token: string | null;
  decodedToken: DecodedJwt | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSupabaseAvailable: boolean;
  signInWithPassword: (credentials: SignInPasswordArgs) => Promise<void>;
  signUpWithPassword: (
    data: SignUpPasswordArgs,
  ) => Promise<{ needsEmailConfirmation?: boolean }>;
  verifyRegistration: (args: VerifyRegistrationArgs) => Promise<void>;
  resendVerificationOtp: (email: string) => Promise<void>;
  checkEmailVerificationStatus: (email: string) => Promise<VerificationStatus>;
  resetPassword: (email: string) => Promise<void>;
  signInWithJwt: (jwtToken: string) => Promise<void>;
  signOut: (options?: SignOutOptions) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const emptySubscribe = () => () => {};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const [token, setToken] = useState<string | null>(() => {
    const existingToken = getClientAuthToken();
    if (existingToken) {
      if (isJwtExpired(existingToken)) {
        removeClientAuthToken();
        return null;
      }
      return existingToken;
    }
    return null;
  });

  const isSupabaseAvailable = isSupabaseConfigured();

  // Listen to Supabase auth state changes and restore existing session
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;

    // Restore active session
    client.auth.getSession().then(({ data: { session }, error }) => {
      if (!error && session?.access_token) {
        if (!isJwtExpired(session.access_token)) {
          syncSessionToCookies(session.access_token);
          setToken(session.access_token);
        } else {
          syncSessionToCookies(null);
          setToken(null);
        }
      }
    });

    // Subscribe to auth state transitions
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(async (event, session) => {
      if (
        session?.access_token &&
        (event === "SIGNED_IN" ||
          event === "TOKEN_REFRESHED" ||
          event === "USER_UPDATED")
      ) {
        syncSessionToCookies(session.access_token);
        setToken(session.access_token);
        await queryClient.invalidateQueries({ queryKey: ["me"] });
      } else if (event === "SIGNED_OUT") {
        syncSessionToCookies(null);
        setToken(null);
        queryClient.removeQueries({ queryKey: ["me"] });
        queryClient.removeQueries({ queryKey: ["teams"] });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const decodedToken = token ? parseJwt(token) : null;

  const {
    data: user,
    isLoading: isUserLoading,
    refetch,
  } = useQuery({
    queryKey: ["me", token],
    queryFn: async () => {
      if (!token) return null;

      try {
        return await apiClient.getMe();
      } catch {
        if (isJwtExpired(token)) {
          syncSessionToCookies(null);
          setToken(null);
          return null;
        }

        if (decodedToken?.sub) {
          const metadata = decodedToken.user_metadata as
            | Record<string, unknown>
            | undefined;
          return {
            id: decodedToken.sub,
            display_name: metadata?.display_name as string,
            email: decodedToken.email,
            created_at: decodedToken.created_at,
          } as User;
        }
      }
    },
    enabled: Boolean(token),
    retry: false,
  });

  const signInWithPassword = useCallback(
    async ({ email, password }: SignInPasswordArgs) => {
      const client = getSupabaseClient();
      if (!client) {
        throw new Error("Authentication service is unavailable");
      }

      const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.session?.access_token) {
        syncSessionToCookies(data.session.access_token);
        setToken(data.session.access_token);
        await queryClient.invalidateQueries({ queryKey: ["me"] });
      }
    },
    [queryClient],
  );

  const signUpWithPassword = useCallback(
    async ({ email, password, displayName }: SignUpPasswordArgs) => {
      const client = getSupabaseClient();
      if (!client) {
        throw new Error("Authentication service is unavailable");
      }

      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName || email.split("@")[0],
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.session?.access_token) {
        syncSessionToCookies(data.session.access_token);
        setToken(data.session.access_token);
        await queryClient.invalidateQueries({ queryKey: ["me"] });
        return { needsEmailConfirmation: false };
      }

      return { needsEmailConfirmation: true };
    },
    [queryClient],
  );

  const checkEmailVerificationStatus = useCallback(
    async (email: string): Promise<VerificationStatus> => {
      const trimmedEmail = email.trim().toLowerCase();
      if (!trimmedEmail) {
        return {
          exists: false,
          waitingConfirmation: false,
          isConfirmed: false,
        };
      }

      const client = getSupabaseClient();
      if (!client) {
        return {
          exists: false,
          waitingConfirmation: false,
          isConfirmed: false,
        };
      }

      try {
        const { data, error } = await client.rpc(
          "check_user_verification_status",
          { user_email: trimmedEmail },
        );
        if (!error && data && typeof data === "object") {
          const raw = data as Record<string, unknown>;
          return {
            exists: Boolean(raw.exists),
            waitingConfirmation: Boolean(raw.waiting_confirmation),
            isConfirmed: Boolean(raw.is_confirmed),
          };
        }
      } catch {
        // Fallback if rpc is unavailable
      }

      return {
        exists: true,
        waitingConfirmation: true,
        isConfirmed: false,
      };
    },
    [],
  );

  const verifyRegistration = useCallback(
    async ({ email, otp }: VerifyRegistrationArgs) => {
      const trimmedEmail = email.trim();
      const sanitizedOtp = otp.trim();

      if (!trimmedEmail) {
        throw new Error("Email is required for verification");
      }

      if (!/^\d{8}$/.test(sanitizedOtp)) {
        throw new Error("Verification code must have 8 numbers");
      }

      const client = getSupabaseClient();
      if (!client) {
        throw new Error("Authentication service is unavailable");
      }

      const { error } = await client.auth.verifyOtp({
        email: trimmedEmail,
        token: sanitizedOtp,
        type: "signup",
      });

      if (error) {
        const retry = await client.auth.verifyOtp({
          email: trimmedEmail,
          token: sanitizedOtp,
          type: "email",
        });
        if (retry.error) {
          throw new Error(error.message || retry.error.message);
        }
      }

      // Clean up any session so user explicitly logs in
      try {
        await client.auth.signOut();
      } catch {
        // Continue cleanup
      }
      removeClientAuthToken();
      setToken(null);
      queryClient.removeQueries({ queryKey: ["me"] });
    },
    [queryClient],
  );

  const resendVerificationOtp = useCallback(
    async (email: string) => {
      const trimmedEmail = email.trim();
      if (!trimmedEmail) {
        throw new Error("Email is required to resend verification code");
      }

      // Check if user exists at auth users table and is waiting for confirmation
      const status = await checkEmailVerificationStatus(trimmedEmail);

      if (!status.exists) {
        throw new Error(
          "No registered account found with this email. Please register first.",
        );
      }

      if (status.isConfirmed || !status.waitingConfirmation) {
        throw new Error("This email is already verified. Please log in.");
      }

      const client = getSupabaseClient();
      if (client) {
        const { error } = await client.auth.resend({
          type: "signup",
          email: trimmedEmail,
        });
        if (error) {
          throw new Error(error.message);
        }
      }
    },
    [checkEmailVerificationStatus],
  );

  const resetPassword = useCallback(async (email: string) => {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error("Authentication service is unavailable");
    }

    const redirectTo = `${window.location.origin}/auth/callback?type=recovery`;
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) {
      throw new Error(error.message);
    }
  }, []);

  const signInWithJwt = useCallback(
    async (jwtToken: string) => {
      if (isJwtExpired(jwtToken)) {
        throw new Error("Cannot sign in with an expired JWT");
      }
      setClientAuthToken(jwtToken);
      setToken(jwtToken);
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    [queryClient],
  );

  const signOut = useCallback(
    async (options?: SignOutOptions) => {
      const client = getSupabaseClient();
      if (client) {
        try {
          await client.auth.signOut();
        } catch {
          // Continue with local cleanup even if remote signOut fails
        }
      }

      syncSessionToCookies(null);
      removeClientAuthToken();
      setToken(null);
      queryClient.removeQueries({ queryKey: ["me"] });
      queryClient.removeQueries({ queryKey: ["teams"] });

      if (options?.redirectTo === false) {
        return;
      }

      const destination = options?.redirectTo ?? "/";
      if (typeof window !== "undefined") {
        if (options?.redirectTo !== undefined || window.location.pathname !== destination) {
          window.location.assign(destination);
        }
      }
    },
    [queryClient],
  );

  const refreshUser = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const isAuthenticated = Boolean(token && user && !isJwtExpired(token));
  const isLoading = !mounted || (Boolean(token) && isUserLoading);

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        token,
        decodedToken,
        isAuthenticated,
        isLoading,
        isSupabaseAvailable,
        signInWithPassword,
        signUpWithPassword,
        verifyRegistration,
        resendVerificationOtp,
        checkEmailVerificationStatus,
        resetPassword,
        signInWithJwt,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function useOptionalAuth(): AuthContextValue | null {
  return useContext(AuthContext) ?? null;
}
