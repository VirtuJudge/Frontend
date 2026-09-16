"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button, Text, Wrapper } from "@/components";
import { apiClient, ApiClientError } from "@/lib/api/client";
import { useAuth } from "@/features/auth";

function InvitationAcceptContent({ token }: { token: string }) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, signOut } = useAuth();

  const [isAccepting, setIsAccepting] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const attemptedRef = useRef(false);

  const executeAccept = React.useCallback(async () => {
    try {
      setIsAccepting(true);
      setErrorStatus(null);
      setErrorMessage(null);
      const membership = await apiClient.acceptInvitation(token);
      router.replace(`/teams/${membership.team_id}`);
    } catch (err: unknown) {
      setIsAccepting(false);
      if (err instanceof ApiClientError) {
        setErrorStatus(err.status);
        if (err.status === 409) {
          setErrorMessage(
            "Email Mismatch: The account you are signed in with does not match the invited recipient address.",
          );
        } else if (err.status === 410) {
          setErrorMessage(
            "This invitation link has expired or has already been accepted.",
          );
        } else if (err.status === 404) {
          setErrorMessage(
            "This invitation link is invalid or has been revoked by the team owner.",
          );
        } else {
          setErrorMessage(err.message || "Failed to accept invitation");
        }
      } else {
        setErrorMessage(
          err instanceof Error ? err.message : "Failed to accept invitation",
        );
      }
    }
  }, [token, router]);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace(
        `/auth/login?redirect=${encodeURIComponent(`/invitations/${token}/accept`)}`,
      );
      return;
    }

    if (!attemptedRef.current) {
      attemptedRef.current = true;
      executeAccept();
    }
  }, [executeAccept, isAuthenticated, isLoading, router, token]);

  const [isSwitchingAccount, setIsSwitchingAccount] = useState(false);

  const handleSwitchAccount = async () => {
    try {
      setIsSwitchingAccount(true);
      await signOut({ redirectTo: false });
      router.push(
        `/auth/login?redirect=${encodeURIComponent(`/invitations/${token}/accept`)}`,
      );
    } finally {
      setIsSwitchingAccount(false);
    }
  };

  if (isLoading || (isAccepting && !errorMessage)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <Wrapper
          variant="glass"
          borderGradient="primary"
          className="w-full max-w-md p-8 flex flex-col items-center gap-4 text-center"
        >
          <span
            className="inline-block h-8 w-8 animate-spin border-4 border-primary border-t-transparent rounded-full"
            aria-hidden="true"
          />
          <Text as="h1" size="lg" className="font-bold">
            Joining Team...
          </Text>
          <Text size="sm" className="text-foreground/70">
            Confirming your invitation and preparing your workspace.
          </Text>
        </Wrapper>
      </div>
    );
  }

  // Error State Handling
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <Wrapper
        variant="glass"
        borderGradient={errorStatus === 409 ? "primary" : "neutral"}
        className="w-full max-w-md p-8 flex flex-col items-center gap-5 text-center"
      >
        <Text
          as="h1"
          size="lg"
          className={`font-bold ${errorStatus === 409 ? "text-amber-400" : "text-red-400"}`}
        >
          {errorStatus === 409
            ? "Account Mismatch"
            : errorStatus === 410
              ? "Invitation Expired"
              : "Unable to Join Team"}
        </Text>

        <Text size="sm" className="text-foreground/80">
          {errorMessage}
        </Text>

        {errorStatus === 409 && user?.email && (
          <div className="w-full p-3 rounded-xl bg-foreground/5 border border-foreground/10 text-xs text-foreground/70 text-left">
            Currently signed in as:{" "}
            <span className="font-semibold text-foreground">{user.email}</span>
          </div>
        )}

        <div className="flex flex-col gap-2.5 w-full mt-2">
          {errorStatus === 409 ? (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSwitchAccount}
                disabled={isSwitchingAccount}
                className="w-full justify-center"
              >
                {isSwitchingAccount
                  ? "Signing out..."
                  : "Sign in with Invited Account"}
              </Button>
              <Button
                href={`/invitations/${token}`}
                variant="glass"
                size="sm"
                className="w-full justify-center"
              >
                View Invitation Details
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  attemptedRef.current = false;
                  executeAccept();
                }}
                className="w-full justify-center"
              >
                Try Again
              </Button>
              <Button
                href="/me"
                variant="glass"
                size="sm"
                className="w-full justify-center"
              >
                Go to My Account
              </Button>
            </>
          )}
        </div>
      </Wrapper>
    </div>
  );
}

function InvitationAcceptWrapper({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = React.use(params);
  return <InvitationAcceptContent token={token} />;
}

export default function InvitationAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  return (
    <React.Suspense
      fallback={
        <div className="flex justify-center items-center min-h-[60vh]">
          <Text size="md">Loading...</Text>
        </div>
      }
    >
      <InvitationAcceptWrapper params={params} />
    </React.Suspense>
  );
}
