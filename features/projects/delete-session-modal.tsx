"use client";

import React, { useEffect, useRef, useState } from "react";
import { Modal, Text, Button } from "@/components";
import { PracticeSession } from "@/lib/api/types";
import { apiClient } from "@/lib/api/client";
import { generateIdempotencyKey } from "@/lib/upload/idempotency";

export interface CancelSessionModalProps {
  session: PracticeSession | null;
  sessionIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onSessionCancelled?: () => void;
}

export function CancelSessionModal({
  session,
  sessionIndex,
  isOpen,
  onClose,
  onSessionCancelled,
}: CancelSessionModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);
  const sessionId = session?.id;

  useEffect(() => {
    idempotencyKeyRef.current = sessionId
      ? generateIdempotencyKey("cancel-session")
      : null;
  }, [sessionId]);

  const handleCancel = async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const idempotencyKey =
        idempotencyKeyRef.current ?? generateIdempotencyKey("cancel-session");
      idempotencyKeyRef.current = idempotencyKey;
      await apiClient.cancelPracticeSession(
        session.id,
        idempotencyKey,
      );
      onSessionCancelled?.();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to cancel session.",
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
      title="Cancel Session"
    >
      <div className="flex flex-col items-center gap-8 text-center my-4 max-w-lg">
        <Text
          size="sm"
          className="text-foreground/80 leading-relaxed text-center"
        >
          You are going to cancel{" "}
          <span className="text-primary font-semibold">
            Session {sessionIndex}
          </span>{" "}
          from this project. It will no longer be active or processed. This
          does not delete session data. Are you sure?
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
            onClick={handleCancel}
            disabled={loading}
            loading={loading}
            className="rounded-full px-8 py-3 bg-[#e11d48] text-white font-bold"
            aria-label="Cancel session"
          >
            Cancel Session
          </Button>
        </div>
      </div>
    </Modal>
  );
}
