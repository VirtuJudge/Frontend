"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { Button } from "./button";
import { Text } from "./text";
import { cn } from "@/lib/utils";

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
  className,
}: ModalProps) {
  const [isMounted, setIsMounted] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 20);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => {
        setIsMounted(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isMounted) return null;

  const generatedTitleId =
    titleId || `modal-title-${title.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/60 backdrop-blur-md transition-opacity duration-300 ease-out",
          isVisible ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onClick={() => {
          if (!loading) onClose();
        }}
      />

      {/* Bottom Sheet Drawer Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={generatedTitleId}
        className="fixed inset-x-0 bottom-0 z-50 flex justify-center pointer-events-none"
      >
        <div
          className={cn(
            "pointer-events-auto w-[94%] max-w-5xl rounded-t-[40px] rounded-b-none border-t border-x border-primary/20 bg-[#030e0e]/95 backdrop-blur-2xl shadow-2xl relative overflow-hidden flex flex-col items-center pt-10 pb-12 px-6 sm:px-12 transition-transform duration-300 ease-out",
            isVisible ? "translate-y-0" : "translate-y-full",
            className,
          )}
        >
          {/* Ambient Glow */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-64 h-28 bg-primary/20 blur-3xl rounded-full pointer-events-none" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer z-10"
          >
            <Icon icon="tabler:x" className="text-xl" />
          </button>

          {/* Title */}
          <Text
            as="h2"
            id={generatedTitleId}
            className="text-2xl sm:text-3xl font-bold text-center text-fg-light mb-6"
          >
            {title}
          </Text>

          {description && (
            <Text
              size="sm"
              className="text-foreground/70 text-center max-w-xl mb-4"
            >
              {description}
            </Text>
          )}

          {error && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger-lighter text-sm mb-4 max-w-xl w-full text-center"
            >
              {error}
            </div>
          )}

          {onSubmit ? (
            <form
              onSubmit={onSubmit}
              className="w-full flex flex-col items-center gap-4"
            >
              {children}

              {footer !== undefined ? (
                footer
              ) : (
                <div className="flex justify-center gap-3 mt-4 w-full">
                  <Button
                    type="button"
                    variant="glass"
                    size="sm"
                    onClick={onClose}
                    disabled={loading}
                    className="rounded-full px-6"
                  >
                    {cancelText}
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={loading}
                    className="rounded-full px-6 font-bold"
                  >
                    {loading ? loadingText : submitText}
                  </Button>
                </div>
              )}
            </form>
          ) : (
            <div className="w-full flex flex-col items-center gap-4">
              {children}
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
