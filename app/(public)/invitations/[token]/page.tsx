"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button, Text, Wrapper } from "@/components";
import { apiClient, ApiClientError } from "@/lib/api/client";
import { useAuth } from "@/features/auth";
import NotFoundPage from "@/app/not-found";
import LoadingPage from "@/app/loading";

export function InvitationPreviewContent({ token }: { token: string }) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

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
        setAcceptError(
          "This invitation has expired or has already been consumed.",
        );
      } else {
        setAcceptError(
          err instanceof Error ? err.message : "Failed to accept invitation",
        );
      }
    } finally {
      setIsAccepting(false);
    }
  };

  if (isLoading) {
    return <LoadingPage />;
  }

  if (previewError || !preview) {
    return <NotFoundPage />;
  }

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
        className="w-full max-w-lg p-6 flex flex-col gap-6"
      >
        <div className="flex flex-col gap-2 text-center">
          <Text as="h1" size="lg" className="font-bold">
            Join {preview.team_name}
          </Text>
          <Text size="sm">
            <span className="font-semibold">
              {preview.invited_by_name || preview.inviter_display_name}
            </span>{" "}
            has invited you to collaborate on VirtuJudge.
          </Text>
        </div>

        <div className="rounded-xl flex flex-col gap-2">
          <div className="flex justify-between flex-wrap">
            <Text size="sm">Invited recipient:</Text>
            <Text size="sm">
              {preview.invited_email || preview.email_masked}
            </Text>
          </div>
          {preview.role && (
            <div className="flex justify-between items-center">
              <Text size="sm">Assigned role:</Text>
              <Text size="sm" className="text-right">
                {preview.role.charAt(0).toUpperCase() + preview.role.slice(1)}
              </Text>
            </div>
          )}
          <div className="flex justify-between gap-2">
            <Text size="sm">Expires:</Text>
            <Text size="sm" className="text-right">
              {new Date(preview.expires_at).toLocaleDateString()}{" "}
              {new Date(preview.expires_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </div>
        </div>

        {acceptError && (
          <div
            role="alert"
            className="p-4 text-center rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex flex-col gap-2"
          >
            <span>{acceptError}</span>
            {acceptError.includes("Email mismatch") && (
              <button
                type="button"
                className="text-primary hover:underline font-semibold text-left cursor-pointer"
              >
                Sign in with a different account →
              </button>
            )}
          </div>
        )}

        {!isAuthenticated ? (
          <div className="flex flex-col gap-3">
            <Button
              href={`/auth/login?redirect=${encodeURIComponent(`/invitations/${token}`)}`}
              variant="primary"
              className="w-full justify-center"
            >
              Sign In
            </Button>
            <Text size="sm" className="text-center">
              You must be signed in with the invited email address to join.
            </Text>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="flex justify-center items-center w-full">
              <Text size="sm" className="truncate text-wrap">
                Signed in as {user?.email}
              </Text>
            </div>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleAccept}
              disabled={isAccepting}
              className="w-full justify-center"
            >
              {isAccepting ? "Joining Team..." : "Accept Invitation"}
            </Button>
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
