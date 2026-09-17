"use client";

import React, { useState } from "react";
import { Modal, Text, Button } from "@/components";
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      await apiClient.deletePracticeSession(session.id);
      (onSessionDeleted ?? onSessionCancelled)?.();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete session.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!session) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!loading) {
          setError(null);
          onClose();
        }
      }}
      title="Delete Session"
    >
      <div className="flex flex-col items-center gap-8 text-center my-4 max-w-lg">
        <Text
          size="sm"
          className="text-foreground/80 leading-relaxed text-center"
        >
          You are going to permanently delete{" "}
          <span className="text-primary font-semibold">
            Session {sessionIndex}
          </span>{" "}
          from this project. All associated attempts, questions, answers, and
          evaluations will be removed. Are you sure?
        </Text>

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
            onClick={onClose}
            disabled={loading}
            className="rounded-full px-8 py-3"
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDelete}
            disabled={loading}
            loading={loading}
            className="rounded-full px-8 py-3 bg-[#e11d48] text-white font-bold"
            aria-label="Delete session"
          >
            Delete Session
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export const CancelSessionModal = DeleteSessionModal;
export type CancelSessionModalProps = DeleteSessionModalProps;
