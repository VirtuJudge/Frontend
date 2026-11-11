"use client";

import React, { useEffect, useRef } from "react";
import { ConfirmActionModal } from "@/components";
import { Project } from "@/lib/api/types";
import { apiClient } from "@/lib/api/client";
import { generateIdempotencyKey } from "@/lib/upload/idempotency";

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
  const idempotencyKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = generateIdempotencyKey("delete-project");
      }
    } else {
      idempotencyKeyRef.current = null;
    }
  }, [isOpen]);

  if (!project) return null;

  return (
    <ConfirmActionModal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Project"
      confirmLabel="Delete Project"
      confirmAriaLabel="Delete project"
      errorMessage="Failed to delete project."
      description={<>You are going to delete <span className="font-semibold text-primary">{project.name}</span> and all of its assets and sessions. This action cannot be undone.</>}
      confirmation={{
        phrase: project.name,
        label: <>Type <span className="font-semibold text-primary">{project.name}</span> to confirm:</>,
        ariaLabel: "Confirm project name",
      }}
      onConfirm={async (confirmation) => {
        if (!idempotencyKeyRef.current) {
          idempotencyKeyRef.current = generateIdempotencyKey("delete-project");
        }
        await apiClient.deleteProject(
          project.id,
          confirmation,
          idempotencyKeyRef.current,
        );
        idempotencyKeyRef.current = null;
        onProjectDeleted?.();
      }}
    />
  );
}
