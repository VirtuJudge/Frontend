"use client";

import React, { useState } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { Modal } from "./modal";
import { Text } from "./text";

export interface ConfirmActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  confirmAriaLabel?: string;
  errorMessage?: string;
  onConfirm: (confirmation: string) => Promise<void>;
  confirmation?: {
    phrase: string;
    label: React.ReactNode;
    ariaLabel: string;
  };
}

/**
 * A destructive-action dialog with a single, consistent loading, error, and
 * confirmation flow. Feature modules supply only their domain-specific copy
 * and mutation, so behavior stays local while the interaction stays uniform.
 */
export function ConfirmActionModal({
  isOpen,
  onClose,
  title,
  description,
  confirmLabel,
  confirmAriaLabel,
  errorMessage,
  onConfirm,
  confirmation,
}: ConfirmActionModalProps) {
  const [typedConfirmation, setTypedConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (loading) return;
    setTypedConfirmation("");
    setError(null);
    onClose();
  };

  const handleConfirm = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (confirmation && typedConfirmation.trim() !== confirmation.phrase) {
      setError(`Please type "${confirmation.phrase}" exactly to confirm deletion.`);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onConfirm(typedConfirmation.trim());
      setLoading(false);
      close();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : (errorMessage ?? `Failed to ${confirmLabel.toLowerCase()}.`),
      );
    } finally {
      setLoading(false);
    }
  };

  const isConfirmationValid =
    !confirmation || typedConfirmation.trim() === confirmation.phrase;

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title={title}
      description={typeof description === "string" ? description : undefined}
      error={error}
      loading={loading}
      onSubmit={handleConfirm}
      submitText={confirmLabel}
      submitVariant="danger"
      isSubmitDisabled={!isConfirmationValid}
    >
      {typeof description !== "string" && (
        <Text size="inherit" className="text-sm sm:text-base text-center leading-relaxed text-foreground/80 mb-2">
          {description}
        </Text>
      )}

      {confirmation && (
        <div className="my-2 flex w-full max-w-md flex-col gap-4 text-left">
          <Input
            value={typedConfirmation}
            label={confirmation.label}
            labelClassName="!text-base sm:!text-lg text-foreground/80 !pl-4"
            onChange={(event) => setTypedConfirmation(event.target.value)}
            placeholder={confirmation.phrase}
            disabled={loading}
            wrapperClassName="!w-full !rounded-full !border-white/10 !bg-white/5"
            className="w-full"
            aria-label={confirmation.ariaLabel}
          />
        </div>
      )}
    </Modal>
  );
}
