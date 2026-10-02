"use client";

import React from "react";
import { ConfirmActionModal } from "@/components";
import { PracticeSession } from "@/lib/api/types";
import { apiClient } from "@/lib/api/client";

export interface DeleteSessionModalProps {
  session: PracticeSession | null;
  sessionIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onSessionDeleted?: () => void;
  onSessionCancelled?: () => void;
}

export function DeleteSessionModal({
  session,
  sessionIndex,
  isOpen,
  onClose,
  onSessionDeleted,
  onSessionCancelled,
}: DeleteSessionModalProps) {
  if (!session) return null;

  return (
    <ConfirmActionModal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Session"
      confirmLabel="Delete Session"
      confirmAriaLabel="Delete session"
      errorMessage="Failed to delete session."
      description={<>You are going to permanently delete <span className="font-semibold text-primary">Session {sessionIndex}</span> from this project. All associated attempts, questions, answers, and evaluations will be removed. Are you sure?</>}
      onConfirm={async () => {
        await apiClient.deletePracticeSession(session.id);
        (onSessionDeleted ?? onSessionCancelled)?.();
      }}
    />
  );
}

const CancelSessionModal = DeleteSessionModal;
type CancelSessionModalProps = DeleteSessionModalProps;
