"use client";

import { useState, useRef } from "react";
import { Icon } from "@iconify/react";
import { AssetVersion } from "@/lib/api/types";
import { formatBytes } from "@/lib/upload";
import { useClickOutside } from "@/hooks/use-click-outside";

export interface DocumentVersionSelectorProps {
  versions?: AssetVersion[];
  selectedVersionId?: string;
  onSelectVersion: (versionId: string) => void;
  disabled?: boolean;
}

export function DocumentVersionSelector({
  versions = [],
  selectedVersionId,
  onSelectVersion,
  disabled = false,
}: DocumentVersionSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(dropdownRef, () => setIsOpen(false), isOpen);

  const activeVersion =
    versions.find((v) => v.id === selectedVersionId) ||
    versions[versions.length - 1];

  if (!versions || versions.length === 0) {
    return (
      <span className="text-xs sm:text-sm text-foreground/50 font-medium">
        v1 (latest)
      </span>
    );
  }

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled || versions.length <= 1}
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg bg-foreground/5 hover:bg-foreground/10 border border-foreground/10 text-foreground/90 transition-colors disabled:opacity-60 disabled:cursor-default"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <Icon icon="tabler:git-branch" className="text-base text-primary" />
        <span>v{activeVersion?.version_number ?? 1}</span>
        {versions.length > 1 && (
          <Icon
            icon="tabler:chevron-down"
            className={`text-sm transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        )}
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 mt-1.5 w-72 rounded-xl bg-background/95 backdrop-blur-md border border-foreground/15 shadow-xl z-50 p-2 flex flex-col gap-1"
        >
          <div className="px-2.5 py-1 text-xs sm:text-sm font-semibold text-foreground/50 uppercase tracking-wider">
            Version History
          </div>
          {versions.map((ver) => {
            const isSelected = ver.id === activeVersion?.id;
            return (
              <button
                key={ver.id}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onSelectVersion(ver.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex flex-col gap-1 transition-colors ${
                  isSelected
                    ? "bg-primary/15 text-primary font-medium"
                    : "hover:bg-foreground/5 text-foreground/80"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm sm:text-base">
                    v{ver.version_number}
                  </span>
                  <span className="text-xs sm:text-sm ">
                    {formatBytes(ver.size_bytes)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-foreground/50 text-xs sm:text-sm">
                  <span className="truncate max-w-xs ">
                    {ver.checksum ? `${ver.checksum.slice(0, 16)}...` : ""}
                  </span>
                  <span>{new Date(ver.created_at).toLocaleDateString()}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
