"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Text, Wrapper } from "@/components";
import { useAuth } from "@/features/auth";
import { getSupabaseClient } from "@/lib/auth/supabase";
import { syncSessionToCookies } from "@/lib/auth/cookies";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signInWithJwt } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function processCallback() {
      const err = searchParams.get("error");
      const errDesc = searchParams.get("error_description");
      if (err || errDesc) {
        const message = errDesc || err || "Authentication failed";
        setError(message);
        router.replace(`/auth/login?error=${encodeURIComponent(message)}`);
        return;
      }

      const redirectUrl = searchParams.get("redirect") || "/me";
      let token = searchParams.get("token") || searchParams.get("access_token");
      const code = searchParams.get("code");

      // Check hash fragment (common with Supabase OAuth redirects)
      if (!token && typeof window !== "undefined" && window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        token = hashParams.get("access_token");
      }

      const client = getSupabaseClient();

      try {
        if (code && client) {
          const { data, error: exchangeError } =
            await client.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
          if (data.session?.access_token) {
            syncSessionToCookies(data.session.access_token);
            await signInWithJwt(data.session.access_token);
          }
        } else if (token) {
          syncSessionToCookies(token);
          await signInWithJwt(token);
        } else if (client) {
          // Check if supabase already picked up the session
          const {
            data: { session },
          } = await client.auth.getSession();
          if (session?.access_token) {
            syncSessionToCookies(session.access_token);
            await signInWithJwt(session.access_token);
          } else {
            router.replace(
              "/auth/login?error=" +
                encodeURIComponent("No authentication tokens provided"),
            );
            return;
          }
        } else {
          router.replace(
            "/auth/login?error=" +
              encodeURIComponent("No authentication tokens provided"),
          );
          return;
        }

        router.replace(redirectUrl);
      } catch (e: unknown) {
        const msg =
          e instanceof Error ? e.message : "Failed to process authentication";
        setError(msg);
      }
    }

    processCallback();
  }, [searchParams, signInWithJwt, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <Wrapper
        variant="glass"
        borderGradient="primary"
        className="w-full max-w-md p-8 flex flex-col items-center gap-4 text-center"
      >
        {error ? (
          <div role="alert" className="text-danger-light">
            <Text as="h2" size="md" className="font-bold mb-2">
              Authentication Error
            </Text>
            <Text size="sm">{error}</Text>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"
              role="status"
              aria-label="Completing sign in"
            />
            <Text size="md" className="font-bold">
              Completing authentication...
            </Text>
            <Text size="sm" className="text-foreground/70">
              Please wait while your session is established.
            </Text>
          </div>
        )}
      </Wrapper>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-[60vh]">
          <Text size="md">Loading...</Text>
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
