"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Button, Text } from "@/components";
import { useAuth } from "@/features/auth";
import { apiClient } from "@/lib/api/client";

export interface PendingInvitation {
  id: string;
  inviterName: string;
  email: string;
  expiresIn: string;
  token?: string;
}

export default function MePage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();

  // Query teams & projects to construct quick session start link
  const { data: teamsPage } = useQuery({
    queryKey: ["teams"],
    queryFn: () => apiClient.getTeams(),
  });
  const teams = teamsPage?.items || [];
  const defaultTeamId = teams[0]?.id;

  const { data: projectsPage } = useQuery({
    queryKey: ["teamProjects", defaultTeamId],
    queryFn: () => apiClient.getProjects(defaultTeamId!),
    enabled: !!defaultTeamId,
  });
  const projects = projectsPage?.items || [];
  const defaultProjectId = projects[0]?.id;

  const startSessionHref = defaultProjectId
    ? `/projects/${defaultProjectId}/session/prepare`
    : "/teams";

  const displayName = user?.display_name || "Omar Salama";

  // Pending invitations list matching me.png
  const [invitations, setInvitations] = useState<PendingInvitation[]>([
    {
      id: "inv-1",
      inviterName: "Mohamed Adel",
      email: "example@mail.com",
      expiresIn: "expires in 4 days",
    },
  ]);

  const [feedback, setFeedback] = useState<{
    text: string;
    type: "success" | "info";
  } | null>(null);

  // Check if an invitation token was provided in URL query parameters
  useEffect(() => {
    const inviteToken = searchParams.get("invitation") || searchParams.get("token");
    if (!inviteToken) return;

    let isMounted = true;
    apiClient
      .getInvitationPreview(inviteToken)
      .then((preview) => {
        if (!isMounted) return;
        const diffMs = new Date(preview.expires_at).getTime() - Date.now();
        const diffDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        const item: PendingInvitation = {
          id: `token-${inviteToken.slice(0, 8)}`,
          inviterName:
            preview.inviter_display_name ||
            preview.invited_by_name ||
            preview.team_name ||
            "Team Invitation",
          email:
            preview.invited_email ||
            preview.email_masked ||
            "example@mail.com",
          expiresIn: `expires in ${diffDays} days`,
          token: inviteToken,
        };
        setInvitations((prev) => {
          if (prev.some((p) => p.token === inviteToken)) return prev;
          return [item, ...prev];
        });
      })
      .catch(() => {
        // Preview token invalid or expired - ignore gracefully
      });

    return () => {
      isMounted = false;
    };
  }, [searchParams]);

  // Dismiss feedback automatically after 4 seconds
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  const handleAcceptInvitation = async (id: string) => {
    const inv = invitations.find((i) => i.id === id);
    if (!inv) return;

    try {
      if (inv.token) {
        await apiClient.acceptInvitation(inv.token);
      }
      setInvitations((prev) => prev.filter((i) => i.id !== id));
      setFeedback({
        text: `Accepted invitation from ${inv.inviterName}`,
        type: "success",
      });
    } catch (err: unknown) {
      setFeedback({
        text:
          err instanceof Error ? err.message : "Failed to accept invitation",
        type: "info",
      });
    }
  };

  const handleDeclineInvitation = (id: string) => {
    const inv = invitations.find((i) => i.id === id);
    if (!inv) return;

    setInvitations((prev) => prev.filter((i) => i.id !== id));
    setFeedback({
      text: `Declined invitation from ${inv.inviterName}`,
      type: "info",
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-160px)] w-full py-8 sm:py-12 select-none">
      {/* Hero: Bonjour & User Name */}
      <div className="flex flex-col items-center text-center mb-8 sm:mb-10">
        <Text>Bonjour</Text>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight mt-1">
          {displayName}
        </h1>
      </div>

      {/* Main Action Buttons */}
      <div className="flex flex-col gap-3.5 w-full max-w-110 mx-auto mb-14 sm:mb-16">
        <Button
          variant="glass"
          borderGradient="default"
          href="/teams"
          className="w-full"
        >
          Manage teams and members
        </Button>

        <Button variant="primary" href={startSessionHref} className="w-full">
          Start a new session
        </Button>
      </div>

      {/* Invitations Card */}
      <div className="w-full max-w-125 mx-auto bg-[#031d1a]/95 border border-[#0a3832] rounded-4xl p-6 sm:p-8 backdrop-blur-md shadow-2xl">
        <h2 className="text-[#00ffd5] text-center font-bold text-xl sm:text-2xl mb-6 tracking-wide">
          Invitations
        </h2>

        {feedback && (
          <div
            role="status"
            className={`mb-4 px-4 py-2 rounded-full text-xs text-center transition-all ${
              feedback.type === "success"
                ? "bg-emerald-950/60 text-[#00e5a3] border border-emerald-800/50"
                : "bg-[#08221f] text-[#709590] border border-[#103a34]"
            }`}
          >
            {feedback.text}
          </div>
        )}

        {invitations.length === 0 ? (
          <div className="py-6 text-center">
            <p className="font-mono text-xs sm:text-sm text-[#709590]">
              No pending invitations
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="rounded-full bg-[#08221f] border border-[#103a34] px-5 py-3 sm:px-6 sm:py-3.5 flex items-center justify-between gap-3 sm:gap-4 w-full"
              >
                <div className="flex flex-col text-left min-w-0 pr-2">
                  <span className="font-mono font-bold text-white text-base sm:text-lg leading-tight truncate">
                    {invitation.inviterName}
                  </span>
                  <span className="font-mono text-xs text-[#709590] truncate">
                    {invitation.email}
                  </span>
                </div>

                <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                  <span className="font-mono text-xs text-[#709590] whitespace-nowrap hidden min-[380px]:inline">
                    {invitation.expiresIn}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleAcceptInvitation(invitation.id)}
                    aria-label={`Accept invitation from ${invitation.inviterName}`}
                    title="Accept invitation"
                    className="p-1 text-[#00e5a3] hover:text-[#46ffca] hover:scale-115 active:scale-95 transition-all cursor-pointer rounded-full focus-visible:ring-2 focus-visible:ring-[#00e5a3] outline-none"
                  >
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeclineInvitation(invitation.id)}
                    aria-label={`Decline invitation from ${invitation.inviterName}`}
                    title="Decline invitation"
                    className="p-1 text-[#ff5c5c] hover:text-[#ff8a8a] hover:scale-115 active:scale-95 transition-all cursor-pointer rounded-full focus-visible:ring-2 focus-visible:ring-[#ff5c5c] outline-none"
                  >
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
