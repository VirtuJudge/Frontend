"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Icon } from "@iconify/react";
import {
  Wrapper,
  Text,
  Button,
  TeamRoleBadge,
  MembersCountBadge,
  TeamProjectsCountBadge,
} from "@/components";
import { apiClient } from "@/lib/api/client";
import { Team } from "@/lib/api/types";
import { CreateTeamModal } from "@/features/teams";

export default function TeamsPage() {
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data: teamsPage, isLoading } = useQuery({
    queryKey: ["teams"],
    queryFn: () => apiClient.getTeams(),
  });

  const teams = teamsPage?.items || [];

  const handleTeamCreated = () => {
    queryClient.invalidateQueries({ queryKey: ["teams"] });
  };

  return (
    <div className="flex flex-col items-center justify-center w-full pb-16 gap-10">
      <Button
        variant="glass-dark"
        borderGradient="default"
        className="cursor-auto active:scale-100 mb-4"
      >
        Teams
      </Button>

      <div className="w-full max-w-4xl flex flex-col gap-4">
        {isLoading ? (
          <Wrapper className="rounded-full py-6 text-center text-foreground/60">
            Loading teams...
          </Wrapper>
        ) : teams.length === 0 ? (
          <Wrapper className="rounded-full py-8 text-center flex flex-col items-center gap-3">
            <Text size="md" className="text-fg">
              No teams yet
            </Text>
            <Text size="xs" className="text-foreground/60">
              Click the button below to create your first team
            </Text>
          </Wrapper>
        ) : (
          teams.map((team: Team) => {
            return (
              <Wrapper
                key={team.id}
                className="rounded-4xl p-2 flex items-center justify-between flex-wrap gap-4 w-full transition-all hover:bg-foreground/5"
              >
                <div className="flex items-center justify-center gap-3 pl-2">
                  <Text className="font-bold">{team.name}</Text>
                  <TeamRoleBadge teamId={team.id} />
                  <Link
                    href={`/teams/${team.id}`}
                    className="text-foreground/70 hover:text-primary transition-colors flex items-center p-1 shrink-0"
                    aria-label={`Open team ${team.name}`}
                  >
                    <Icon
                      icon="solar:arrow-right-up-linear"
                      className="text-xl"
                    />
                  </Link>
                </div>

                <div className="flex flex-end justify-end items-center gap-3 flex-wrap">
                  <MembersCountBadge teamId={team.id} />

                  <TeamProjectsCountBadge teamId={team.id} />
                </div>
              </Wrapper>
            );
          })
        )}
      </div>

      <Button
        onClick={() => setIsCreateModalOpen(true)}
        variant="primary"
        aria-label="Create new team"
        title="Create new team"
        className="px-7 py-3 rounded-full text-3xl font-bold w-fit"
      >
        <Icon icon="tabler:plus" />
      </Button>

      <CreateTeamModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onTeamCreated={handleTeamCreated}
      />
    </div>
  );
}
