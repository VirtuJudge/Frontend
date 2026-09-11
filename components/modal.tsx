"use client";

import React, { useEffect } from "react";
import { Button, Text, Wrapper } from "@/components";
import { Icon } from "@iconify/react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  titleId?: string;
  description?: string;
  error?: string | null;
  onSubmit?: (e: React.FormEvent) => void;
  loading?: boolean;
  submitText?: string;
  loadingText?: string;
  cancelText?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  titleId,
  description,
  error,
  onSubmit,
  loading = false,
  submitText = "Save",
  loadingText = "Saving...",
  cancelText = "Cancel",
  children,
  footer,
  className = "w-full max-w-md",
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const generatedTitleId =
    titleId || `modal-title-${title.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={generatedTitleId}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <Wrapper
        variant="glass"
        borderGradient="primary"
        className={`${className} p-6 flex flex-col gap-5 relative animate-in fade-in zoom-in-95 duration-150`}
      >
        <div className="flex gap-2 justify-between items-center">
          <Text as="h2" size="md" id={generatedTitleId} className="font-bold">
            {title}
          </Text>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="text-primary hover:text-primary/80 transition-colors cursor-pointer"
          >
            <Icon icon="mdi:close-outline" width={25} />
          </button>
        </div>

        {description && (
          <Text size="sm" className="text-foreground/70">
            {description}
          </Text>
        )}

        {error && (
          <div
            role="alert"
            className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger-lighter text-sm"
          >
            {error}
          </div>
        )}

        {onSubmit ? (
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            {children}

            {footer !== undefined ? (
              footer
            ) : (
              <div className="flex justify-end gap-3 mt-2">
                <Button
                  type="button"
                  variant="glass"
                  size="sm"
                  onClick={onClose}
                  disabled={loading}
                >
                  {cancelText}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={loading}
                >
                  {loading ? loadingText : submitText}
                </Button>
              </div>
            )}
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            {children}
            {footer}
          </div>
        )}
      </Wrapper>
    </div>
  );
}
