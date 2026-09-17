"use client";

import React, { useState } from "react";
import { Modal, Text, Button, Input } from "@/components";
import { Project } from "@/lib/api/types";
import { apiClient } from "@/lib/api/client";

export interface DeleteProjectModalProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onProjectDeleted?: () => void;
}

export function DeleteProjectModal({
  project,
  isOpen,
  onClose,
  onProjectDeleted,
}: DeleteProjectModalProps) {
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!project) return;
    if (confirmation.trim() !== project.name) {
      setError(`Please type "${project.name}" exactly to confirm deletion.`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiClient.deleteProject(project.id, confirmation.trim());
      onProjectDeleted?.();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete project.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!project) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!loading) {
          setError(null);
          setConfirmation("");
          onClose();
        }
      }}
      title="Delete Project"
    >
      <div className="flex flex-col items-center gap-6 text-center my-4 max-w-lg">
        <Text
          size="sm"
          className="text-foreground/80 leading-relaxed text-center"
        >
          You are going to delete{" "}
          <span className="text-primary font-semibold">{project.name}</span> and
          all of its assets and sessions. This action cannot be undone.
        </Text>

        <div className="w-full flex flex-col gap-2 text-left">
          <Text size="xs" className="text-foreground/60">
            Type{" "}
            <span className="font-semibold text-primary">{project.name}</span>{" "}
            to confirm:
          </Text>
          <Input
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder={project.name}
            disabled={loading}
            wrapperClassName="!rounded-full !bg-white/5 !border-white/10"
            className="w-full"
            aria-label="Confirm project name"
          />
        </div>

        {error && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger-lighter text-sm text-center w-full"
          >
            {error}
          </div>
        )}

        <div className="flex items-center justify-center gap-4">
          <Button
            variant="glass"
            size="sm"
            onClick={() => {
              setConfirmation("");
              setError(null);
              onClose();
            }}
            disabled={loading}
            className="rounded-full px-8 py-3"
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDelete}
            disabled={loading || confirmation.trim() !== project.name}
            loading={loading}
            className="rounded-full px-8 py-3 bg-[#e11d48] text-white font-bold"
            aria-label="Delete project"
          >
            Delete Project
          </Button>
        </div>
      </div>
    </Modal>
  );
}
