"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@iconify/react";
import { useSessionTimer } from "@/hooks";
import { useSessionRecordingSettings } from "@/hooks";
import { useSessionRecording } from "@/hooks";
import { useSessionSubmit } from "@/hooks";
import { RecordedPreview } from "./recorded-preview";
import {
  MediaPermissionPrompt,
  SessionHeader,
  SessionConfirmationModal,
  SessionCountdown,
  SessionFooterControls,
} from "@/features/session";

export function SessionRecordContent({ projectId }: { projectId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { showTimer, allowPauses, initialDuration } =
    useSessionRecordingSettings(projectId, searchParams);

  const [downloadId] = useState(() => Date.now());

  const [showStartModal, setShowStartModal] = useState(false);
  const [showRestartModal, setShowRestartModal] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const handleCameraReady = useCallback((openModalOnReady: boolean) => {
    if (openModalOnReady) setShowStartModal(true);
  }, []);
  const handleCameraBlocked = useCallback(() => setShowStartModal(false), []);

  const {
    liveVideoRef,
    recordedChunksRef,
    stopStream,
    revokeVideoUrl,
    isPaused,
    togglePause,
    hasCamera,
    isBlocked,
    isRequesting,
    videoUrl,
    stopRecording,
    retryCamera,
    recordAgain,
    restartRecording,
  } = useSessionRecording({
    projectId,
    isRecording,
    countdown,
    setCountdown,
    setIsRecording,
    onCameraReady: handleCameraReady,
    onCameraBlocked: handleCameraBlocked,
  });

  const {
    isSubmitting,
    submitError,
    uploadProgress,
    setSubmitError,
    setUploadProgress,
    handleSubmit,
  } = useSessionSubmit({
    projectId,
    videoUrl,
    recordedChunksRef,
  });

  const handleConfirmStart = () => {
    setShowStartModal(false);
    setCountdown(3);
  };

  const handleCancelStart = () => {
    setShowStartModal(false);
    stopRecording();
    router.push(`/projects/${projectId}/session/prepare`);
  };

  const isTimerBlocked =
    !hasCamera ||
    isBlocked ||
    showRestartModal ||
    showStartModal ||
    countdown !== null ||
    !isRecording ||
    !!videoUrl;

  const { formattedTime, resetTimer } = useSessionTimer({
    initialDuration,
    isPaused,
    isBlocked: isTimerBlocked,
  });

  const handleBackToProject = () => {
    stopStream();
    revokeVideoUrl();
    router.push(`/projects/${projectId}`);
  };

  const handleRetry = () => {
    retryCamera();
  };

  const handleRecordAgain = () => {
    setSubmitError(null);
    setUploadProgress(null);
    resetTimer(initialDuration);
    recordAgain();
  };

  const handleOpenRestartModal = () => {
    setShowRestartModal(true);
  };

  const handleCancelRestartModal = () => {
    setShowRestartModal(false);
  };

  const handleConfirmRestart = () => {
    setShowRestartModal(false);
    setShowStartModal(false);
    resetTimer(initialDuration);
    restartRecording();
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-[#111918] overflow-hidden select-none z-50">
      <div className="relative w-full h-full flex items-center justify-center">
        {videoUrl ? (
          <RecordedPreview
            videoUrl={videoUrl}
            downloadId={downloadId}
            isSubmitting={isSubmitting}
            uploadProgress={uploadProgress}
            submitError={submitError}
            onRecordAgain={handleRecordAgain}
            onSubmit={handleSubmit}
          />
        ) : (
          /* Live Camera View & Active Recording Controls */
          <>
            {submitError && (
              <div className="fixed top-20 inset-x-4 max-w-md mx-auto p-3 rounded-xl bg-danger/20 border border-danger/40 text-white text-sm text-center z-50 backdrop-blur-md shadow-lg flex items-center justify-between gap-2">
                <span>{submitError}</span>
                <button
                  type="button"
                  onClick={() => setSubmitError(null)}
                  className="text-white/80 hover:text-white cursor-pointer"
                  aria-label="Dismiss error"
                >
                  <Icon icon="tabler:x" className="text-base" />
                </button>
              </div>
            )}
            
            <video
              ref={liveVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover -scale-x-100 ${
                hasCamera ? "" : "hidden"
              }`}
            />

            {!hasCamera && (
              <MediaPermissionPrompt
                isBlocked={isBlocked}
                isRequesting={isRequesting}
                onRetry={handleRetry}
                onBack={() => {
                  stopRecording();
                  router.push(`/projects/${projectId}/session/prepare`);
                }}
              />
            )}

            <SessionHeader onNavigate={handleBackToProject} />

            <SessionFooterControls
              allowPauses={allowPauses}
              isPaused={isPaused}
              showTimer={showTimer}
              formattedTime={formattedTime}
              onTogglePause={() => togglePause(allowPauses)}
              onStopRecording={stopRecording}
              onRestartModalOpen={handleOpenRestartModal}
            />

            <SessionCountdown countdown={countdown} />

            {/* Start Confirmation Modal */}
            <SessionConfirmationModal
              isOpen={showStartModal}
              title="Start recording session?"
              description="Make sure you are framed well. Once you confirm, a 3-second countdown will begin before recording starts."
              confirmLabel="Start Recording"
              cancelLabel="Back to Prepare"
              onConfirm={handleConfirmStart}
              onCancel={handleCancelStart}
            />

            {/* Restart Confirmation Modal */}
            <SessionConfirmationModal
              isOpen={showRestartModal}
              title="Restart session?"
              description="Any data or indices in this session will be lost"
              confirmLabel="Restart"
              onConfirm={handleConfirmRestart}
              onCancel={handleCancelRestartModal}
            />
          </>
        )}
      </div>
    </div>
  );
}
