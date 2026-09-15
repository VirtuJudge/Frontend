"use client";

import { Icon } from "@iconify/react";
import { UploadItem } from "@/hooks/use-direct-upload";
import { formatBytes } from "@/lib/upload";
import { Button, Text } from "@/components";

export interface UploadProgressListProps {
  items: UploadItem[];
  onRetry?: (id: string) => void;
  onCancel?: (id: string) => void;
  onRemove?: (id: string) => void;
}

export function UploadProgressList({
  items,
  onRetry,
  onCancel,
  onRemove,
}: UploadProgressListProps) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 w-full" aria-label="Uploads in progress">
      <div className="flex items-center justify-between">
        <Text size="sm" className="font-semibold text-foreground/80">
          Upload Activity ({items.length})
        </Text>
      </div>

      <div className="flex flex-col gap-2.5">
        {items.map((item) => {
          const isFailed = item.stage === "error" || item.stage === "rejected";
          const isVerified = item.stage === "verified";
          const isInProgress = !isFailed && !isVerified;

          return (
            <div
              key={item.id}
              className={`p-3.5 rounded-xl border flex flex-col gap-2.5 transition-all ${
                isFailed
                  ? "bg-red-500/10 border-red-500/30"
                  : isVerified
                    ? "bg-emerald-500/10 border-emerald-500/30"
                    : "bg-foreground/5 border-foreground/10"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold truncate max-w-xs md:max-w-md">
                      {item.file.name}
                    </span>
                    <span className="text-xs text-foreground/50">
                      {formatBytes(item.file.size)}
                    </span>
                  </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isInProgress && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary border border-primary/30">
                      <Icon icon="tabler:loader-2" className="animate-spin text-xs" />
                      {item.stage === "hashing" && `Hashing ${item.hashProgress}%`}
                      {item.stage === "requesting_intent" && "Authorizing"}
                      {item.stage === "uploading" && `Uploading ${item.progress}%`}
                      {item.stage === "completing" && "Finalizing"}
                      {item.stage === "verifying" && "Verifying"}
                      {item.stage === "validating" && "Checking"}
                    </span>
                  )}

                  {isVerified && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <Icon icon="tabler:circle-check" className="text-sm" />
                      Verified
                    </span>
                  )}

                  {isFailed && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/30">
                      <Icon icon="tabler:alert-circle" className="text-sm" />
                      {item.stage === "rejected" ? "Rejected" : "Failed"}
                    </span>
                  )}

                  {isInProgress && onCancel && (
                    <Button
                      variant="glass"
                      size="sm"
                      onClick={() => onCancel(item.id)}
                      className="text-xs px-2 py-1 h-7"
                    >
                      Cancel
                    </Button>
                  )}

                  {isFailed && onRetry && (
                    <Button
                      variant="glass"
                      size="sm"
                      onClick={() => onRetry(item.id)}
                      className="text-xs px-2 py-1 h-7 text-primary hover:text-primary-focus"
                    >
                      <Icon icon="tabler:rotate" className="text-xs" />
                      Retry
                    </Button>
                  )}

                  {onRemove && (
                    <button
                      type="button"
                      onClick={() => onRemove(item.id)}
                      className="p-1 rounded-md text-foreground/40 hover:text-foreground/80 hover:bg-foreground/10 transition-colors"
                      aria-label="Dismiss upload item"
                    >
                      <Icon icon="tabler:x" className="text-sm" />
                    </button>
                  )}
                </div>
              </div>

              {isInProgress && (
                <div className="w-full bg-foreground/10 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-300 rounded-full"
                    style={{
                      width: `${
                        item.stage === "hashing"
                          ? item.hashProgress * 0.3
                          : item.stage === "uploading"
                            ? 30 + item.progress * 0.6
                            : item.stage === "verifying"
                              ? 95
                              : 10
                      }%`,
                    }}
                  />
                </div>
              )}

              {isFailed && (item.rejectionReason || item.error) && (
                <div className="text-xs text-red-300/90 bg-red-500/10 px-2.5 py-1.5 rounded-lg flex items-start gap-1.5">
                  <Icon
                    icon="tabler:alert-triangle"
                    className="text-sm shrink-0 mt-0.5 text-red-400"
                  />
                  <span>{item.rejectionReason || item.error}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
