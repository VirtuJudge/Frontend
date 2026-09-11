"use client";

import React, { useState } from "react";
import { Input, Modal } from "@/components";
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create a New Project"
      titleId="create-project-title"
      error={error}
      loading={loading}
      onSubmit={handleSubmit}
      submitText="Create Project"
      loadingText="Creating..."
    >
      <Input
        label="Project Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Series A Pitch Rehearsal"
        disabled={loading}
        className="w-full"
      />

      <Input
        label="Description (Optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Preparing for investor pitch demo day"
        disabled={loading}
        className="w-full"
      />
    </Modal>
  );
}
