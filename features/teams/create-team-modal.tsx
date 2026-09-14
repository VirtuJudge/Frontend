"use client";

import React, { useState } from "react";
import { Button, Input, Modal } from "@/components";
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
      title="Create a team"
      titleId="create-team-title"
      error={error}
      loading={loading}
      footer={null}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xl flex flex-col gap-2.5 my-4"
      >
        <span className="pl-6 text-sm text-foreground/80 font-medium text-left">
          Team name
        </span>
        <div className="flex items-center gap-3 w-full">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. VirtuJudge Pitch Team"
            disabled={loading}
            autoFocus
            wrapperClassName="!w-full !rounded-full !bg-white/5 !border-white/10"
            className="w-full"
          />
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            className="rounded-full px-8 py-3.5 font-bold shrink-0"
          >
            {loading ? "Creating..." : "Create"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
