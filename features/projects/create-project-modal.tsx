"use client";

import React, { useState } from "react";
import { Button, Input, Modal } from "@/components";
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
      title="Create a project"
      titleId="create-project-title"
      error={error}
      loading={loading}
      footer={null}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-2xl flex flex-col gap-2.5 my-4"
      >
        <div className="flex flex-col flex-wrap justify-center items-center gap-5 w-full">
            <Input
              value={name}
              label="Project name"
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Series A Pitch Rehearsal"
              disabled={loading}
              autoFocus
              wrapperClassName="!rounded-full !bg-white/5 !border-white/10"
              className="max-w-md w-full"
            />
            <Input
              value={description}
              label="Project description"
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the project's goals and scope"
              disabled={loading}
              wrapperClassName="!rounded-full !bg-white/5 !border-white/10"
              className="max-w-md w-full"
            />

          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            className="rounded-full px-10 py-2 font-bold shrink-0"
          >
            {loading ? "Creating..." : "Create"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
