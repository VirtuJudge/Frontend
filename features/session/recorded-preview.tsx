"use client";

import { Icon } from "@iconify/react";
import { Button, Text } from "@/components";

interface RecordedPreviewProps {
  videoUrl: string;
  downloadId: number;
  isSubmitting: boolean;
  uploadProgress: { stage: string; percent: number } | null;
  submitError: string | null;
  onRecordAgain: () => void;
  onSubmit: () => void;
}

/** Displays a completed recording and its submission controls. */
export function RecordedPreview({
  videoUrl,
  downloadId,
  isSubmitting,
  uploadProgress,
  submitError,
  onRecordAgain,
  onSubmit,
}: RecordedPreviewProps) {
  return (
    <div className="relative w-full max-w-5xl p-6 m-4 sm:p-8 rounded-2xl bg-[#0e1716]/90 border border-primary/10 backdrop-blur-xl shadow-2xl flex flex-col items-center gap-6 z-40">
      <Text size="lg" className="text-center">
        Recorded Preview
      </Text>

      <div className="w-full max-h-[55vh] aspect-video rounded-xl overflow-hidden bg-black shadow-inner flex items-center justify-center border border-white/5">
        <video
          src={videoUrl}
          controls
          autoPlay
          playsInline
          className="w-full h-full object-contain"
          aria-label="Recorded presentation video preview"
        />
      </div>

      {uploadProgress && (
        <div className="w-full flex flex-col gap-2 px-2">
          <div className="flex justify-between text-xs sm:text-sm text-white/80 font-medium">
            <span>{uploadProgress.stage}</span>
            <span>{uploadProgress.percent}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-accent h-full transition-all duration-300 rounded-full"
              style={{ width: `${uploadProgress.percent}%` }}
            />
          </div>
        </div>
      )}

      {submitError && (
        <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-sm text-center w-full">
          {submitError}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 w-full *:min-w-65">
        <Button onClick={onRecordAgain} className="flex-1" disabled={isSubmitting}>
          <Icon icon="tabler:rotate" />
          <span>Record Again</span>
        </Button>
        <Button
          variant="primary"
          className="flex-1"
          onClick={onSubmit}
          loading={isSubmitting}
          disabled={isSubmitting}
        >
          <Icon icon="tabler:upload" />
          <span>Submit</span>
        </Button>
        <Button className="flex-1" disabled={isSubmitting}>
          <a
            href={videoUrl}
            download={`recording-${downloadId}.webm`}
            className="flex items-center gap-3"
          >
            <Icon icon="tabler:download" />
            <span>Download Video</span>
          </a>
        </Button>
      </div>
    </div>
  );
}
