"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Text, Wrapper } from "@/components";
import { useAuth } from "@/features/auth";
import { apiClient } from "@/lib/api/client";
import { TeamSelector } from "@/features/teams";

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();

  const { data: teamsPage, isLoading: isTeamsLoading } = useQuery({
    queryKey: ["teams"],
    queryFn: () => apiClient.getTeams(),
  });

  const teams = teamsPage?.items || [];

  const handleTeamCreated = () => {
    queryClient.invalidateQueries({ queryKey: ["teams"] });
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-6xl mx-auto pb-12">
      <Wrapper
        variant="glass"
        borderGradient="default"
        className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
      >
        <div className="flex flex-col gap-1 text-left">
          <Text as="h1" size="lg" className="font-bold text-left">
            Dashboard
          </Text>
          <Text size="sm" className="text-fg-light text-left">
            Welcome back, {user?.display_name || user?.email || "Presenter"}.
          </Text>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="danger" size="sm" onClick={() => signOut()}>
            Sign Out
          </Button>
        </div>
      </Wrapper>

      {isTeamsLoading ? (
        <Wrapper variant="glass" borderGradient="default" className="p-8 text-center">
          <Text size="sm" className="text-fg-light">
            Loading teams...
          </Text>
        </Wrapper>
      ) : (
        <TeamSelector
          teams={teams}
          onTeamCreated={handleTeamCreated}
        />
      )}
    </div>
  );
}

