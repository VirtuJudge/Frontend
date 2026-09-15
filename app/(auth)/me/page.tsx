"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
  const [greeting] = useState(
    new Date().getHours() < 12
      ? "morning"
      : new Date().getHours() < 18
        ? "afternoon"
        : "evening",
  );

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

  const displayName = user?.display_name;

  const [feedback, setFeedback] = useState<{
    text: string;
    type: "success" | "info";
  } | null>(null);

  // Check if an invitation token was provided in URL query parameters

  // Dismiss feedback automatically after 4 seconds
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-160px)] w-full py-8 sm:py-12">
      <div className="flex flex-col items-center text-center mb-8 sm:mb-10">
        <Text>Good {greeting},</Text>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight mt-1">
          {displayName}
        </h1>
        <Text className="text-xl max-w-[26ch] sm:max-w-full truncate">
          {user?.email}
        </Text>
      </div>

      {/* Main Action Buttons */}
      <div className="flex flex-col gap-6 w-full max-w-110 mx-auto mb-14 sm:mb-16">
        <Button
          variant="glass"
          borderGradient="default"
          href="/teams"
          className="w-full"
        >
          My Teams
        </Button>

        <Button variant="primary" href={startSessionHref} className="w-full">
          Start a new session
        </Button>
      </div>
    </div>
  );
}
