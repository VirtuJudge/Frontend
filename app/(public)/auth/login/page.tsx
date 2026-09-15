"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/features/auth";
import RightSection from "@/components/auth/right-section";
import { Button, Input, Text } from "@/components";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signInWithPassword, isAuthenticated } = useAuth();

  const redirectUrl = searchParams.get("redirect") || "/dashboard";
  const initialError = searchParams.get("error");
  const isVerified = searchParams.get("verified") === "true";
  const initialMessage =
    searchParams.get("message") ||
    (isVerified
      ? "Registration verified successfully! Please log in with your credentials."
      : null);
  const initialEmail = searchParams.get("email") || "";

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
    <div className="flex flex-col min-[1080px]:flex-row items-center justify-between w-full crop-to-screen">
      <div className="flex flex-col items-center justify-center gap-8 w-full min-[1080px]:w-1/2">
        <Text size="lg">Welcome Back</Text>

        <Text className="w-full px-8">
          Enrich your presentation skills with our most advanced tools, and
          become the next one on stage!
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
            disabled={loading}
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
      </div>
      <RightSection />
    </div>
  );
}
