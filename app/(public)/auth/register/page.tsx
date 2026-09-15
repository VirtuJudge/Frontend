"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Text } from "@/components";
import Link from "next/link";
import { useAuth } from "@/features/auth";
import AuthContainer from "@/components/auth/container";

export default function RegisterPage() {
  const router = useRouter();
  const { signUpWithPassword, checkEmailVerificationStatus, isAuthenticated } =
    useAuth();

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/me");
    }
  }, [isAuthenticated, router]);

  const handleRegister = async (e?: React.SubmitEvent) => {
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
    if (!agreedToTerms && !agreedToPrivacy) {
      setError(
        "Please agree to the terms and conditions and data privacy policy",
      );
      return;
    }
    if (!agreedToTerms) {
      setError("Please agree to the terms and conditions");
      return;
    }
    if (!agreedToPrivacy) {
      setError("Please agree to the data privacy policy");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      // Check if the user already exists before attempting signup
      const status = await checkEmailVerificationStatus(email.trim());

      if (status.exists) {
        if (status.isConfirmed || !status.waitingConfirmation) {
          // User exists and is already verified — send them to login
          router.push(
            `/auth/login?email=${encodeURIComponent(email.trim())}&message=${encodeURIComponent("An account with this email already exists. Please log in.")}`,
          );
          return;
        }

        // User exists but hasn't confirmed their email — send them to verify
        router.push(
          `/auth/verify-registration?email=${encodeURIComponent(email.trim())}`,
        );
        return;
      }

      const result = await signUpWithPassword({
        email: email.trim(),
        password,
        displayName: displayName.trim() || undefined,
      });

      if (typeof window !== "undefined") {
        localStorage.setItem("is_new_registration", "true");
      }

      if (result.needsEmailConfirmation) {
        router.push(
          `/auth/verify-registration?email=${encodeURIComponent(email.trim())}`,
        );
      } else {
        router.replace("/");
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
    <AuthContainer>
      <Text size="lg">Be the next one!</Text>
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

        <div className="flex flex-col gap-3 w-full">
          <div className="flex items-center gap-4 w-full px-6">
            <input
              type="radio"
              id="terms-and-conditions"
              name="terms-and-conditions"
              checked={agreedToTerms}
              onClick={() => setAgreedToTerms((prev) => !prev)}
              onChange={() => {}}
              disabled={loading}
              className="accent-primary cursor-pointer w-4 h-4"
              aria-label="I agree to VirtuJudge's terms and conditions"
            />
            <label
              htmlFor="terms-and-conditions"
              className="cursor-pointer select-none text-fg-light"
            >
              I agree to VirtuJudge&#8217;s{" "}
              <Link
                href="/terms-and-conditions"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-primary transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                terms and conditions
              </Link>{" "}
            </label>
          </div>

          <div className="flex items-center gap-4 w-full px-6">
            <input
              type="radio"
              id="data-privacy"
              name="data-privacy"
              checked={agreedToPrivacy}
              onClick={() => setAgreedToPrivacy((prev) => !prev)}
              onChange={() => {}}
              disabled={loading}
              className="accent-primary cursor-pointer w-4 h-4"
              aria-label="I agree to VirtuJudge's data privacy policy"
            />
            <label
              htmlFor="data-privacy"
              className="cursor-pointer select-none text-fg-light"
            >
              I agree to VirtuJudge&#8217;s{" "}
              <Link
                href="/data-privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-primary transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                data privacy policy
              </Link>{" "}
            </label>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          className="w-full mt-2"
          disabled={
            loading ||
            !agreedToTerms ||
            !agreedToPrivacy ||
            !email.trim() ||
            !password ||
            !confirmPassword
          }
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
    </AuthContainer>
  );
}
