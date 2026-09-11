"use client";

import React, { useState } from "react";
import { Input, Modal } from "@/components";
import { apiClient } from "@/lib/api/client";
import { Team } from "@/lib/api/types";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Team name is required");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const idempotencyKey = `team-create-${Date.now()}`;
      const team = await apiClient.createTeam(name.trim(), idempotencyKey);
      setName("");
      onTeamCreated(team);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create team");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create a New Team"
      titleId="create-team-title"
      error={error}
      loading={loading}
      onSubmit={handleSubmit}
      submitText="Create Team"
      loadingText="Creating..."
    >
      <Input
        label="Team Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. VirtuJudge Pitch Team"
        disabled={loading}
        autoFocus
        className="w-full"
      />
    </Modal>
  );
}
