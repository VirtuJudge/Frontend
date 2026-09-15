"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RightSection from "@/components/auth/right-section";
import { Button, Input, Text } from "@/components";
import Link from "next/link";
import { useAuth } from "@/features/auth";

export default function RegisterPage() {
  const router = useRouter();
  const { signUpWithPassword, isAuthenticated } = useAuth();

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/me");
    }
  }, [isAuthenticated, router]);

  const handleRegister = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }
    if (!displayName.trim()) {
      setError("Please enter a display name");
      return;
    }
    if (!password) {
      setError("Please enter a password");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      const result = await signUpWithPassword({
        email: email.trim(),
        password,
        displayName: displayName.trim() || undefined,
      });

      if (result.needsEmailConfirmation) {
        router.push(
          `/auth/verify-registration?email=${encodeURIComponent(email.trim())}`,
        );
      } else {
        router.replace("/me");
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to register account",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-[1080px]:flex-row items-center justify-between w-full">
      <div className="flex flex-col items-center justify-center gap-8 w-full min-[1080px]:w-1/2">
        <Text size="lg">Be the next one!</Text>

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
            className="w-full p-3 rounded-2xl bg-primary/20 border border-primary/40 text-primary-lighter text-center"
          >
            {successMessage}
          </Text>
        )}

        <form
          onSubmit={handleRegister}
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
            label="Display Name"
            type="text"
            placeholder="Enter your display name"
            className="w-full"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={loading}
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

          <Input
            label="Confirm Password"
            type="password"
            placeholder="Confirm your password"
            className="w-full"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            required
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full mt-2"
            disabled={loading}
          >
            {loading ? "Registering..." : "Register"}
          </Button>
        </form>

        <Text size="xs">
          Already have an account?{" "}
          <Link href="/auth/login" className="underline">
            Log in here!
          </Link>
          {" • "}
          <Link href="/terms-and-conditions" className="underline">
            Terms and conditions
          </Link>
          {" • "}
          <Link href="/data-privacy" className="underline">
            Data privacy
          </Link>
        </Text>
      </div>
      <RightSection />
    </div>
  );
}
