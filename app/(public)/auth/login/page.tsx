"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/features/auth";
import { Button, Input, Text } from "@/components";
import Link from "next/link";
import AuthContainer from "@/components/auth/container";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signInWithPassword, isAuthenticated } = useAuth();

  const isVerified = searchParams.get("verified") === "true";
  const defaultRedirect = isVerified ? "/" : "/dashboard";
  const redirectUrl = searchParams.get("redirect") || defaultRedirect;
  const initialError = searchParams.get("error");
  const initialMessage =
    searchParams.get("message") ||
    (isVerified
      ? "Registration verified successfully! Please log in with your credentials."
      : null);
  const initialEmail = searchParams.get("email") || "";

  useEffect(() => {
    if (isVerified && typeof window !== "undefined") {
      localStorage.setItem("is_new_registration", "true");
    }
  }, [isVerified]);

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    initialError ? decodeURIComponent(initialError) : null,
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(
    initialMessage ? decodeURIComponent(initialMessage) : null,
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(redirectUrl);
    }
  }, [isAuthenticated, redirectUrl, router]);

  const handleSignIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }
    if (!password) {
      setError("Please enter your password");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);
      await signInWithPassword({ email: email.trim(), password });
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContainer>
      <Text size="lg">Welcome Back</Text>

      <Text className="w-full px-8">
        Enrich your presentation skills with our most advanced tools, and become
        the next one on stage!
      </Text>

      {error && (
        <Text
          role="alert"
          className="w-full p-3 rounded-2xl bg-danger/20 border border-danger/40 text-danger-lighter text-center"
        >
          {error}
        </Text>
      )}

      {successMessage && (
        <Text
          role="status"
          className="w-full p-3 rounded-2xl bg-success/20 border border-success/40 text-success-lighter text-center"
        >
          {successMessage}
        </Text>
      )}

      <form
        onSubmit={handleSignIn}
        className="flex flex-col items-center gap-6 w-full"
      >
        <Input
          label="Email"
          type="email"
          placeholder="Enter your email"
          className="w-full"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          required
        />

        <Input
          label="Password"
          type="password"
          placeholder="Enter your password"
          className="w-full"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          required
        />

        <Button
          type="submit"
          variant="primary"
          className="w-full mt-4"
          disabled={loading || !email.trim() || !password}
        >
          {loading ? "Signing in..." : "Login"}
        </Button>
      </form>

      <Text size="xs">
        First time?{" "}
        <Link href="/auth/register" className="underline">
          Register now!
        </Link>
        {" • "}
        <Link href="/auth/forgot-password" className="underline">
          Forgot your password?
        </Link>
      </Text>
    </AuthContainer>
  );
}
