"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input, Text } from "@/components";
import RightSection from "@/components/auth/right-section";
import { useAuth } from "@/features/auth";
import { getSupabaseClient } from "@/lib/auth/supabase";
import AuthContainer from "@/components/auth/container";

const MIN_PASSWORD_LENGTH = 8;

export default function ResetPasswordPage() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      setError(
        "Authentication service is unavailable. Please try again later.",
      );
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await client.auth.updateUser({ password });
      if (updateError) {
        throw new Error(updateError.message);
      }

      await signOut({ redirectTo: false });
      router.replace("/auth/login?passwordReset=success");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to reset password.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContainer>
      <Text size="lg">Choose a New Password</Text>
      <Text className="w-full px-8">
        Enter a new password for your VirtuJudge account.
      </Text>

      {error && (
        <Text
          role="alert"
          className="w-full p-3 rounded-2xl bg-danger/20 border border-danger/40 text-danger-lighter text-center"
        >
          {error}
        </Text>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex flex-col items-center gap-6 w-full"
      >
        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          className="w-full"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={loading}
          required
          minLength={MIN_PASSWORD_LENGTH}
        />
        <Input
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          placeholder="Re-enter your new password"
          className="w-full"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          disabled={loading}
          required
          minLength={MIN_PASSWORD_LENGTH}
        />
        <Button
          type="submit"
          variant="primary"
          className="w-full mt-2"
          disabled={loading}
        >
          {loading ? "Updating password..." : "Update Password"}
        </Button>
      </form>

      <Text size="xs">
        <Link href="/auth/login" className="underline">
          Back to Login
        </Link>
      </Text>
    </AuthContainer>
  );
}
