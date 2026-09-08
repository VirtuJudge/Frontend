"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button, Text, Wrapper } from "@/components";
import { Team } from "@/lib/api/types";
import { CreateTeamModal } from "./create-team-modal";

interface TeamSelectorProps {
  teams: Team[];
  selectedTeamId: string | null;
  onSelectTeam: (teamId: string) => void;
  onTeamCreated: (newTeam: Team) => void;
}

export function TeamSelector({
  teams,
  selectedTeamId,
  onSelectTeam,
  onTeamCreated,
}: TeamSelectorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div>
          <Text as="h2" size="md" className="font-bold">
            Your Teams
          </Text>
          <Text size="sm" className="text-foreground/70">
            Select a team to view projects and manage members
          </Text>
        </div>
        <Button
          variant="glass"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="text-sm"
        >
          + New Team
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map((team) => {
          const isSelected = team.id === selectedTeamId;
          return (
            <Wrapper
              key={team.id}
              variant="glass"
              borderGradient={isSelected ? "primary" : "neutral"}
              className={`p-5 flex flex-col justify-between gap-4 cursor-pointer transition-all ${
                isSelected
                  ? "ring-2 ring-primary/60 bg-primary/5"
                  : "hover:bg-foreground/5"
              }`}
              onClick={() => onSelectTeam(team.id)}
            >
              <div className="flex justify-between items-start">
                <Text as="h3" size="md" className="font-bold truncate">
                  {team.name}
                </Text>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full uppercase tracking-wider font-semibold ${
                    team.role === "owner"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                  }`}
                >
                  {team.role}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs text-foreground/60 pt-2 border-t border-foreground/10">
                <span>{team.member_count} member{team.member_count === 1 ? "" : "s"}</span>
                <Link
                  href={`/teams/${team.id}`}
                  className="text-primary hover:underline font-semibold"
                  onClick={(e) => e.stopPropagation()}
                >
                  Manage Team →
                </Link>
              </div>
            </Wrapper>
          );
        })}
      </div>

      <CreateTeamModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onTeamCreated={onTeamCreated}
      />
    </div>
  );
}
