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
  removeClientAuthToken,
  syncSessionToCookies,
} from "@/lib/auth/cookies";
import {
  parseJwt,
  isJwtExpired,
  DecodedJwt,
} from "@/lib/auth/jwt";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/auth/supabase";
import { useAuthRecovery } from "@/hooks";
import { useAuthActions } from "@/hooks/auth/use-auth-actions";

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
  verifyPasswordRecoveryOtp: (email: string, otp: string) => Promise<void>;
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

  const applyAuthenticatedSession = useCallback(
    async (accessToken: string) => {
      syncSessionToCookies(accessToken);
      setToken(accessToken);
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    [queryClient],
  );

  const { resetPassword, verifyPasswordRecoveryOtp } = useAuthRecovery({
    onAuthenticated: applyAuthenticatedSession,
  });

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

  const authActions = useAuthActions(setToken, refetch);

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
        resetPassword,
        verifyPasswordRecoveryOtp,
        ...authActions,
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
