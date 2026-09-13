"use client";

import { Wrapper } from "@/components";

export interface SessionConfirmationModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function SessionConfirmationModal({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel = "Back to the session",
  onConfirm,
  onCancel,
}: SessionConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center z-50 p-4">
      <h2 className="text-3xl sm:text-4xl  font-medium text-white mb-3 text-center">
        {title}
      </h2>
      <p className="text-sm sm:text-base  text-white/70 mb-8 text-center max-w-md">
        {description}
      </p>
      <div className="flex items-center gap-4 flex-wrap justify-center">
        <button
          type="button"
          onClick={onConfirm}
          className="h-12 w-60 rounded-full  font-bold text-black bg-[#00e5cc] hover:bg-[#00f5db] active:scale-95 transition-all cursor-pointer shadow-lg flex items-center justify-center text-center"
        >
          {confirmLabel}
        </button>
        <Wrapper
          as="button"
          variant="glass-dark"
          borderGradient="default"
          onClick={onCancel}
          className="h-12 w-60 py-0 rounded-full  font-medium text-white/90 hover:brightness-125 active:scale-95 transition-all cursor-pointer flex items-center justify-center text-center"
        >
          {cancelLabel}
        </Wrapper>
      </div>
    </div>
  );
}
