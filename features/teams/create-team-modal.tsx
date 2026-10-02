"use client";

import React, { useState } from "react";
import { Button, Input, Modal } from "@/components";
import { apiClient } from "@/lib/api/client";
import { Team } from "@/lib/api/types";
import { useAsyncAction } from "@/hooks";

interface CreateTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTeamCreated: (newTeam: Team) => void;
}

export function CreateTeamModal({
  isOpen,
  onClose,
  onTeamCreated,
}: CreateTeamModalProps) {
  const [name, setName] = useState("");
  const { error, isPending: loading, run, setError } = useAsyncAction(
    () => apiClient.createTeam(name.trim(), `team-create-${Date.now()}`),
    "Failed to create team",
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Team name is required");
      return;
    }

    const team = await run();
    if (!team) return;

    setName("");
    onTeamCreated(team);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create a team"
      titleId="create-team-title"
      error={error}
      loading={loading}
      onSubmit={handleSubmit}
      submitText="Create"
      loadingText="Creating..."
    >
      <div className="flex w-full max-w-md flex-col gap-4 py-2">
        <Input
          value={name}
          label="Team name"
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. VirtuJudge Pitch Team"
          disabled={loading}
          autoFocus
          wrapperClassName="!w-full !rounded-full !border-white/10 !bg-white/5"
          className="w-full"
        />
      </div>
    </Modal>
  );
}
