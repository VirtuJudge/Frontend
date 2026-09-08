"use client";

import React, { useState } from "react";
import { Button, Input, Text, Wrapper } from "@/components";
import { apiClient } from "@/lib/api/client";
import { Project } from "@/lib/api/types";

interface CreateProjectModalProps {
  teamId: string;
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: (newProject: Project) => void;
}

export function CreateProjectModal({
  teamId,
  isOpen,
  onClose,
  onProjectCreated,
}: CreateProjectModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Project name is required");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const idempotencyKey = `proj-create-${Date.now()}`;
      const project = await apiClient.createProject(
        teamId,
        {
          name: name.trim(),
          description: description.trim() || undefined,
        },
        idempotencyKey,
      );
      setName("");
      setDescription("");
      onProjectCreated(project);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-project-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
    >
      <Wrapper
        variant="glass"
        borderGradient="primary"
        className="w-full max-w-md p-6 flex flex-col gap-5 relative animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex justify-between items-center">
          <Text as="h2" size="md" id="create-project-title" className="font-bold">
            Create a New Project
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
            label="Project Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Series A Pitch Rehearsal"
            disabled={loading}
            autoFocus
          />

          <Input
            label="Description (Optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Preparing for investor pitch demo day"
            disabled={loading}
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
              {loading ? "Creating..." : "Create Project"}
            </Button>
          </div>
        </form>
      </Wrapper>
    </div>
  );
}
