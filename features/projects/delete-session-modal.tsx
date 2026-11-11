"use client";

import React, { useEffect, useRef } from "react";
import { ConfirmActionModal } from "@/components";
import { PracticeSession } from "@/lib/api/types";
import { apiClient } from "@/lib/api/client";
import { generateIdempotencyKey } from "@/lib/upload/idempotency";

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
  const idempotencyKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = generateIdempotencyKey("delete-session");
      }
    } else {
      idempotencyKeyRef.current = null;
    }
  }, [isOpen]);

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
        if (!idempotencyKeyRef.current) {
          idempotencyKeyRef.current = generateIdempotencyKey("delete-session");
        }
        await apiClient.deletePracticeSession(
          session.id,
          idempotencyKeyRef.current,
        );
        idempotencyKeyRef.current = null;
        (onSessionDeleted ?? onSessionCancelled)?.();
      }}
    />
  );
}

const CancelSessionModal = DeleteSessionModal;
type CancelSessionModalProps = DeleteSessionModalProps;
