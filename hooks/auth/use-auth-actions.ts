import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/auth/supabase";
import {
  setClientAuthToken,
  removeClientAuthToken,
  syncSessionToCookies,
} from "@/lib/auth/cookies";
import { isJwtExpired } from "@/lib/auth/jwt";
import {
  SignInPasswordArgs,
  SignUpPasswordArgs,
  VerifyRegistrationArgs,
  VerificationStatus,
  SignOutOptions,
} from "@/features/auth/auth-context";

export function useAuthActions(
  setToken: (token: string | null) => void,
  refetch: () => Promise<unknown>
) {
  const queryClient = useQueryClient();

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
    [queryClient, setToken],
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
    [queryClient, setToken],
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
    [queryClient, setToken],
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

  const signInWithJwt = useCallback(
    async (jwtToken: string) => {
      if (isJwtExpired(jwtToken)) {
        throw new Error("Cannot sign in with an expired JWT");
      }
      setClientAuthToken(jwtToken);
      setToken(jwtToken);
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    [queryClient, setToken],
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
    [queryClient, setToken],
  );

  const refreshUser = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    signInWithPassword,
    signUpWithPassword,
    verifyRegistration,
    resendVerificationOtp,
    checkEmailVerificationStatus,
    signInWithJwt,
    signOut,
    refreshUser,
  };
}
