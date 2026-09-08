"use client";

import React, { useState } from "react";
import { Button, Input, Text, Wrapper } from "@/components";
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

  if (!isOpen) return null;

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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-team-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
    >
      <Wrapper
        variant="glass"
        borderGradient="primary"
        className="w-full max-w-md p-6 flex flex-col gap-5 relative animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex justify-between items-center">
          <Text as="h2" size="md" id="create-team-title" className="font-bold">
            Create a New Team
          </Text>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="text-foreground/50 hover:text-foreground text-xl font-bold cursor-pointer"
          >
            ×
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Team Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. VirtuJudge Pitch Team"
            disabled={loading}
            autoFocus
          />

          <div className="flex justify-end gap-3 mt-2">
            <Button
              type="button"
              variant="glass"
              size="sm"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Team"}
            </Button>
          </div>
        </form>
      </Wrapper>
    </div>
  );
}
