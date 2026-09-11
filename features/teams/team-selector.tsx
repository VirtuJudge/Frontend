"use client";

import { useState } from "react";
import { Button, Text, Wrapper } from "@/components";
import { Team } from "@/lib/api/types";
import { CreateTeamModal } from "./create-team-modal";

interface TeamSelectorProps {
  teams: Team[];
  selectedTeamId?: string;
  onSelectTeam?: (teamId: string) => void;
  onTeamCreated: (newTeam: Team) => void;
}

export function TeamSelector({
  teams,
  onTeamCreated,
}: TeamSelectorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center gap-4">
        <div>
          <Text as="h2" size="md" className="font-bold text-left pl-2">
            Your Teams
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

      {teams.length === 0 ? (
        <Wrapper
          variant="glass"
          borderGradient="neutral"
          className="p-8 text-center flex flex-col items-center gap-3"
        >
          <Text size="md" className="font-semibold">
            No teams yet
          </Text>
          <Text size="sm">
            Get started by creating your first team to collaborate on pitch
            projects and invite members.
          </Text>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="mt-2"
          >
            Create Your First Team
          </Button>
        </Wrapper>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => {
            return (
              <Wrapper
                key={team.id}
                variant="glass"
                className="p-5 flex flex-col justify-between gap-4 transition-all hover:bg-foreground/5"
              >
                <div className="flex items-center justify-between gap-2 px-2 flex-wrap">
                  <Text
                    as="h3"
                    size="md"
                    className="font-bold truncate text-wrap text-left"
                  >
                    {team.name}
                  </Text>
                  <Text size="xs">
                    Created: {new Date(team.created_at).toLocaleDateString()}
                  </Text>
                </div>

                <Button
                  href={`/teams/${team.id}`}
                  size="sm"
                  variant="primary"
                  onClick={(e) => e.stopPropagation()}
                >
                  Go to Team
                </Button>
              </Wrapper>
            );
          })}
        </div>
      )}

      <CreateTeamModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onTeamCreated={onTeamCreated}
      />
    </div>
  );
}
