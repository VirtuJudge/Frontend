"use client";

import React, { useState } from "react";
import { Button, Input, Modal } from "@/components";
import { apiClient } from "@/lib/api/client";
import { Project } from "@/lib/api/types";
import { useAsyncAction } from "@/hooks";

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
  const { error, isPending: loading, run, setError } = useAsyncAction(
    () =>
      apiClient.createProject(
        teamId,
        {
          name: name.trim(),
          description: description.trim() || undefined,
        },
        `proj-create-${Date.now()}`,
      ),
    "Failed to create project",
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Project name is required");
      return;
    }

    const project = await run();
    if (!project) return;

    setName("");
    setDescription("");
    onProjectCreated(project);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create a project"
      titleId="create-project-title"
      error={error}
      loading={loading}
      onSubmit={handleSubmit}
      submitText="Create"
      loadingText="Creating..."
    >
      <div className="flex w-full max-w-md flex-col items-center gap-4 py-2">
        <Input
          value={name}
          label="Project name"
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Series A Pitch Rehearsal"
          disabled={loading}
          autoFocus
          wrapperClassName="!w-full !rounded-full !border-white/10 !bg-white/5"
          className="w-full"
        />
        <Input
          value={description}
          label="Project description"
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Describe the project's goals and scope"
          disabled={loading}
          wrapperClassName="!w-full !rounded-full !border-white/10 !bg-white/5"
          className="w-full"
        />
      </div>
    </Modal>
  );
}
