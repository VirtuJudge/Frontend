"use client";

import React, { useState } from "react";
import RightSection from "@/components/auth/right-section";
import { Button, Input, Text } from "@/components";
import Link from "next/link";
import { useAuth } from "@/features/auth";

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleReset = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await resetPassword(email.trim());
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-[1080px]:flex-row items-center justify-between w-full">
      <div className="flex flex-col items-center justify-center gap-8 w-full min-[1080px]:w-1/2">
        <Text size="lg">Reset Password</Text>

        <Text className="w-full px-8">
          Enter the email address associated with your account, and we will send
          you a link to reset your password.
        </Text>

        {error && (
          <Text
            role="alert"
            className="w-full p-3 rounded-2xl bg-danger/20 border border-danger/40 text-danger-lighter text-center"
          >
            {error}
          </Text>
        )}

        {submitted ? (
          <div className="flex flex-col items-center gap-6 w-full px-8 text-center">
            <Text
              role="status"
              className="w-full p-4 rounded-2xl bg-primary/20 border border-primary/40 text-primary-lighter"
            >
              If an account with {email} exists, a password reset email has been sent.
              Please check your inbox.
            </Text>

            <Button variant="primary" href="/auth/login" className="w-full">
              Back to Login
            </Button>
          </div>
        ) : (
          <form onSubmit={handleReset} className="flex flex-col items-center gap-6 w-full">
            <Input
              label="Email"
              type="email"
              placeholder="Enter your email address"
              className="w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              disabled={loading}
            >
              {loading ? "Sending reset link..." : "Send Reset Link"}
            </Button>
          </form>
        )}

        <Text size="xs">
          Remembered your password?{" "}
          <Link href="/auth/login" className="underline">
            Back to Login
          </Link>
        </Text>
      </div>
      <RightSection />
    </div>
  );
}
