"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button, Text, Wrapper } from "@/components";
import { apiClient, ApiClientError } from "@/lib/api/client";
import { useAuth } from "@/features/auth";

export function InvitationPreviewContent({ token }: { token: string }) {
  const router = useRouter();
  const { user, isAuthenticated, signOut } = useAuth();

  const [isAccepting, setIsAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const {
    data: preview,
    isLoading,
    error: previewError,
  } = useQuery({
    queryKey: ["invitationPreview", token],
    queryFn: () => apiClient.getInvitationPreview(token),
    retry: false,
  });

  const handleAccept = async () => {
    try {
      setIsAccepting(true);
      setAcceptError(null);
      const membership = await apiClient.acceptInvitation(token);
      router.push(`/teams/${membership.team_id}`);
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.status === 409) {
        setAcceptError(
          "Email mismatch: The account you are signed in with does not match the invited email address.",
        );
      } else if (err instanceof ApiClientError && err.status === 410) {
        setAcceptError("This invitation has expired or has already been consumed.");
      } else {
        setAcceptError(
          err instanceof Error ? err.message : "Failed to accept invitation",
        );
      }
    } finally {
      setIsAccepting(false);
    }
  };

  const handleSwitchAccount = async () => {
    await signOut();
    router.push(`/auth/login?redirect=${encodeURIComponent(`/invitations/${token}`)}`);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Text size="md">Loading invitation preview...</Text>
      </div>
    );
  }

  // Handle preview errors (404 or 410)
  if (previewError || !preview) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <Wrapper
          variant="glass"
          borderGradient="neutral"
          className="w-full max-w-md p-8 flex flex-col items-center gap-4 text-center"
        >
          <Text as="h1" size="lg" className="font-bold text-red-400">
            Invitation Unavailable
          </Text>
          <Text size="sm" className="text-foreground/70">
            This invitation link is invalid, has expired, or has already been revoked.
          </Text>
          <Button href="/" variant="glass" size="sm" className="mt-2">
            Return to Home
          </Button>
        </Wrapper>
      </div>
    );
  }

  // Handle non-pending status (e.g. revoked or expired)
  if (preview.status !== "pending") {
    const statusMessages = {
      expired: "This invitation link has expired.",
      revoked: "This invitation was revoked by the team owner.",
      accepted: "This invitation has already been accepted.",
    };

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <Wrapper
          variant="glass"
          borderGradient="neutral"
          className="w-full max-w-md p-8 flex flex-col items-center gap-4 text-center"
        >
          <Text as="h1" size="lg" className="font-bold">
            Invitation {preview.status.toUpperCase()}
          </Text>
          <Text size="sm" className="text-foreground/70">
            {statusMessages[preview.status as keyof typeof statusMessages] ||
              "This invitation is no longer active."}
          </Text>
          <Button href="/" variant="glass" size="sm" className="mt-2">
            Return to Home
          </Button>
        </Wrapper>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <Wrapper
        variant="glass"
        borderGradient="primary"
        className="w-full max-w-lg p-8 flex flex-col gap-6"
      >
        <div className="flex flex-col gap-2 text-center">
          <Text as="h1" size="lg" className="font-bold">
            Join {preview.team_name}
          </Text>
          <Text size="sm" className="text-foreground/70">
            <span className="font-semibold text-foreground">
              {preview.inviter_display_name}
            </span>{" "}
            has invited you to collaborate on VirtuJudge.
          </Text>
        </div>

        <div className="p-4 rounded-xl bg-foreground/5 border border-foreground/10 flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-foreground/60">Invited recipient:</span>
            <span className="font-semibold text-foreground">
              {preview.email_masked}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-foreground/60">Expires:</span>
            <span>{new Date(preview.expires_at).toLocaleDateString()}</span>
          </div>
        </div>

        {acceptError && (
          <div
            role="alert"
            className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex flex-col gap-2"
          >
            <span>{acceptError}</span>
            {acceptError.includes("Email mismatch") && (
              <button
                type="button"
                onClick={handleSwitchAccount}
                className="text-primary hover:underline font-semibold text-left cursor-pointer"
              >
                Sign in with a different account →
              </button>
            )}
          </div>
        )}

        {/* Action Buttons depending on auth state */}
        {!isAuthenticated ? (
          <div className="flex flex-col gap-3">
            <Button
              href={`/auth/login?redirect=${encodeURIComponent(`/invitations/${token}`)}`}
              variant="primary"
              className="w-full justify-center"
            >
              Sign In to Accept Invitation
            </Button>
            <Text size="sm" className="text-center text-foreground/50 text-xs">
              You must be signed in with the invited email address to join.
            </Text>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="text-xs text-foreground/60 text-center">
              Signed in as{" "}
              <span className="font-semibold text-foreground">
                {user?.email}
              </span>
            </div>

            <Button
              type="button"
              variant="primary"
              onClick={handleAccept}
              disabled={isAccepting}
              className="w-full justify-center"
            >
              {isAccepting ? "Joining Team..." : "Accept Invitation & Join Team"}
            </Button>

            <button
              type="button"
              onClick={handleSwitchAccount}
              className="text-xs text-foreground/50 hover:text-foreground text-center cursor-pointer hover:underline"
            >
              Not your account? Switch user
            </button>
          </div>
        )}
      </Wrapper>
    </div>
  );
}

function InvitationPreviewWrapper({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = React.use(params);
  return <InvitationPreviewContent token={token} />;
}

export default function InvitationPreviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  return (
    <React.Suspense
      fallback={
        <div className="flex justify-center items-center min-h-[60vh]">
          <Text size="md">Loading invitation preview...</Text>
        </div>
      }
    >
      <InvitationPreviewWrapper params={params} />
    </React.Suspense>
  );
}
