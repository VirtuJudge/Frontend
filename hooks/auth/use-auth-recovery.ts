"use client";

import { useCallback } from "react";
import { getSupabaseClient } from "@/lib/auth/supabase";

export interface AuthRecoveryActions {
  resetPassword: (email: string) => Promise<void>;
  verifyPasswordRecoveryOtp: (email: string, otp: string) => Promise<void>;
}

interface UseAuthRecoveryOptions {
  onAuthenticated: (accessToken: string) => Promise<void>;
}

/** Encapsulates recovery-specific Supabase calls and their validation rules. */
export function useAuthRecovery({
  onAuthenticated,
}: UseAuthRecoveryOptions): AuthRecoveryActions {
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

  const verifyPasswordRecoveryOtp = useCallback(
    async (email: string, otp: string) => {
      const trimmedEmail = email.trim();
      const sanitizedOtp = otp.trim();

      if (!trimmedEmail) {
        throw new Error("Email is required to verify the reset code");
      }
      if (!/^\d{6,8}$/.test(sanitizedOtp)) {
        throw new Error("Reset code must contain 6 to 8 numbers");
      }

      const client = getSupabaseClient();
      if (!client) {
        throw new Error("Authentication service is unavailable");
      }

      const { data, error } = await client.auth.verifyOtp({
        email: trimmedEmail,
        token: sanitizedOtp,
        type: "recovery",
      });
      if (error) {
        throw new Error(error.message);
      }
      if (!data.session?.access_token) {
        throw new Error("The reset code did not create a recovery session");
      }

      await onAuthenticated(data.session.access_token);
    },
    [onAuthenticated],
  );

  return { resetPassword, verifyPasswordRecoveryOtp };
}
