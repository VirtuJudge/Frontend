"use client";

import { useState, useMemo, use, useRef, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@iconify/react";
import { Wrapper, Button, Text } from "@/components";
import { useSessionTimer } from "@/hooks/use-session-timer";
import {
  MediaPermissionPrompt,
  SessionHeader,
  SessionControlPill,
  SessionTimerBadge,
  SessionConfirmationModal,
} from "@/features/session";

export function SessionRecordContent({ projectId }: { projectId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const timerParam = searchParams.get("timer");
  const pauseParam = searchParams.get("pause");
  const durationParam = searchParams.get("duration");

  interface StoredSessionConfig {
    projectId?: string;
    timer?: boolean;
    pause?: boolean;
    presentationDuration?: number;
  }

  const storedConfig = useMemo<StoredSessionConfig | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = sessionStorage.getItem(`session_config_${projectId}`);
      return raw ? (JSON.parse(raw) as StoredSessionConfig) : null;
    } catch {
      return null;
    }
  }, [projectId]);

  const showTimer =
    timerParam !== null ? timerParam === "true" : (storedConfig?.timer ?? true);

  const allowPauses =
    pauseParam !== null ? pauseParam === "true" : (storedConfig?.pause ?? true);

  const initialDuration = useMemo<number>(() => {
    if (durationParam) {
      const parsed = parseInt(durationParam, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    if (storedConfig?.presentationDuration) {
      return storedConfig.presentationDuration;
    }
    return 595;
  }, [durationParam, storedConfig]);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [downloadId] = useState(() => Date.now());

  const [showStartModal, setShowStartModal] = useState(false);
  const [showRestartModal, setShowRestartModal] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isRequesting, setIsRequesting] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const videoUrlRef = useRef<string | null>(null);
  const isStoppedRef = useRef(false);
  const hasInitializedRef = useRef(false);

  const initCamera = useCallback((openModalOnReady = true) => {
    if (isStoppedRef.current) {
      return;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
      mediaRecorderRef.current = null;
    }
    if (liveVideoRef.current && liveVideoRef.current.srcObject) {
      liveVideoRef.current.srcObject = null;
    }
    if (videoUrlRef.current) {
      URL.revokeObjectURL(videoUrlRef.current);
      videoUrlRef.current = null;
    }

    recordedChunksRef.current = [];

    navigator.mediaDevices
      ?.getUserMedia({
        video: {
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          frameRate: { ideal: 30, max: 60 },
        },
        audio: true,
      })
      .then((stream) => {
        if (isStoppedRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        mediaStreamRef.current = stream;

        if (liveVideoRef.current) {
          liveVideoRef.current.srcObject = stream;
          try {
            liveVideoRef.current.play()?.catch(() => {});
          } catch {}
        }

        const options: MediaRecorderOptions = {};
        if (
          typeof MediaRecorder !== "undefined" &&
          MediaRecorder.isTypeSupported?.("video/webm")
        ) {
          options.mimeType = "video/webm";
        }

        let recorder: MediaRecorder;
        try {
          recorder = new MediaRecorder(stream, options);
        } catch {
          recorder = new MediaRecorder(stream);
        }
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = () => {
          if (recordedChunksRef.current.length > 0) {
            const blob = new Blob(recordedChunksRef.current, {
              type: options.mimeType || "video/webm",
            });
            const url = URL.createObjectURL(blob);
            videoUrlRef.current = url;
            setVideoUrl(url);
          }

          if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((track) => track.stop());
            mediaStreamRef.current = null;
          }
          mediaRecorderRef.current = null;
          setIsRecording(false);
          setHasCamera(false);
        };

        setHasCamera(true);
        setIsRequesting(false);
        setIsBlocked(false);

        if (openModalOnReady) {
          setShowStartModal(true);
        }
      })
      .catch(() => {
        setHasCamera(false);
        setIsRequesting(false);
        setIsBlocked(true);
        setShowStartModal(false);
      });
  }, []);

  const stopRecording = useCallback(() => {
    isStoppedRef.current = true;
    setIsRecording(false);
    setCountdown(null);
    setShowStartModal(false);

    // Immediately stop media stream tracks to shut down hardware lights right away
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }

    setHasCamera(false);
  }, []);

  // Countdown timer: 3, 2, 1 -> start recording
  useEffect(() => {
    if (countdown === null) return;

    const stepMs = process.env.NODE_ENV === "test" ? 10 : 1000;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((prev) => (prev !== null && prev > 1 ? prev - 1 : 0));
      }, stepMs);
      return () => clearTimeout(timer);
    }

    if (countdown === 0) {
      setCountdown(null);
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === "inactive"
      ) {
        try {
          mediaRecorderRef.current.start();
          setIsRecording(true);
        } catch {}
      }
    }
  }, [countdown]);

  // Initial camera setup
  useEffect(() => {
    if (
      !hasInitializedRef.current &&
      !isStoppedRef.current &&
      !videoUrlRef.current
    ) {
      hasInitializedRef.current = true;
      initCamera(true);
    }

    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        try {
          mediaRecorderRef.current.stop();
        } catch {}
        mediaRecorderRef.current = null;
      }
    };
  }, [initCamera]);

  const handleConfirmStart = () => {
    setShowStartModal(false);
    setCountdown(3);
  };

  const handleCancelStart = () => {
    setShowStartModal(false);
    stopRecording();
    router.push(`/projects/${projectId}/session/prepare`);
  };

  const handleTogglePause = (allowed: boolean) => {
    if (!allowed || !isRecording) return;

    setIsPaused((prev) => {
      const next = !prev;
      if (mediaRecorderRef.current) {
        if (next && mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.pause();
        } else if (!next && mediaRecorderRef.current.state === "paused") {
          mediaRecorderRef.current.resume();
        }
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current
          .getVideoTracks()
          .forEach((t) => (t.enabled = !next));
      }
      return next;
    });
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
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoUrlRef.current) {
      URL.revokeObjectURL(videoUrlRef.current);
      videoUrlRef.current = null;
    }
    router.push(`/projects/${projectId}`);
  };

  const handleRetry = () => {
    isStoppedRef.current = false;
    hasInitializedRef.current = true;
    setIsRequesting(true);
    setIsBlocked(false);
    initCamera(true);
  };

  const handleRecordAgain = () => {
    isStoppedRef.current = false;
    hasInitializedRef.current = true;
    setIsRecording(false);
    setCountdown(null);
    if (videoUrlRef.current) {
      URL.revokeObjectURL(videoUrlRef.current);
      videoUrlRef.current = null;
    }
    setVideoUrl(null);
    setIsRequesting(true);
    setIsBlocked(false);
    resetTimer(initialDuration);
    initCamera(true);
  };

  const handleOpenRestartModal = () => {
    setShowRestartModal(true);
  };

  const handleCancelRestartModal = () => {
    setShowRestartModal(false);
  };

  const handleConfirmRestart = () => {
    setShowRestartModal(false);
    isStoppedRef.current = false;
    hasInitializedRef.current = true;
    setIsRecording(false);
    setCountdown(null);
    if (videoUrlRef.current) {
      URL.revokeObjectURL(videoUrlRef.current);
      videoUrlRef.current = null;
    }
    setVideoUrl(null);
    setIsRequesting(true);
    setIsBlocked(false);
    resetTimer(initialDuration);
    initCamera(true);
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-[#111918] overflow-hidden select-none z-50">
      <div className="relative w-full h-full flex items-center justify-center">
        {videoUrl ? (
          /* Recorded Preview & Download Section */
          <div className="relative w-full max-w-5xl p-6 sm:p-8 rounded-2xl bg-[#0e1716]/90 border border-primary/10 backdrop-blur-xl shadow-2xl flex flex-col items-center gap-6 z-40">
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

            <div className="flex flex-wrap items-center justify-between gap-4 w-full *:min-w-65">
              <Button onClick={handleRecordAgain} className="flex-1">
                <Icon icon="tabler:rotate" />
                <span>Record Again</span>
              </Button>

              <Button
                variant="primary"
                className="flex-1"
                // onClick={handleRecordAgain} will be replaced with the actual submit handler when integrated
              >
                <Icon icon="tabler:upload" />
                <span>Submit</span>
              </Button>

              <Button className="flex-1">
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
        ) : (
          /* Live Camera View & Active Recording Controls */
          <>
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

            <div className="fixed bottom-8 inset-x-0 px-6 sm:px-12 flex items-center z-40 flex-wrap gap-3">
              <div className="flex-1 flex items-center justify-start">
                <div className="flex items-center gap-3 pointer-events-auto">
                  <Wrapper
                    as="button"
                    variant="glass-dark"
                    borderGradient="default"
                    onClick={handleOpenRestartModal}
                    className="w-12 h-12 p-0 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-xl cursor-pointer hover:brightness-125"
                    aria-label="Restart session"
                  >
                    <Icon icon="tabler:rotate" className="text-xl" />
                  </Wrapper>

                  <Wrapper
                    variant="glass-dark"
                    className="h-12 px-5 py-0 rounded-full flex items-center gap-2 font-medium"
                    aria-label="Presentation"
                  >
                    <Icon icon="tabler:presentation" className="text-xl" />
                    <span>Presentation</span>
                  </Wrapper>
                </div>
              </div>

              <div className="flex items-center justify-center pointer-events-auto shrink-0">
                <SessionControlPill
                  allowPauses={allowPauses}
                  isPaused={isPaused}
                  onTogglePause={() => handleTogglePause(allowPauses)}
                  onEnd={stopRecording}
                />
              </div>

              <div className="flex-1 flex items-center justify-end">
                <SessionTimerBadge
                  showTimer={showTimer}
                  formattedTime={formattedTime}
                />
              </div>
            </div>

            {countdown !== null && countdown > 0 && (
              <div
                className="fixed inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center z-50 pointer-events-none"
                aria-live="assertive"
                aria-label={`Recording starts in ${countdown}`}
              >
                <div className="flex flex-col items-center justify-center">
                  <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-black/70 backdrop-blur-md flex items-center justify-center shadow-[0_0_60px_rgba(6,249,228,0.4)] transition-all transform scale-100">
                    <span className="text-8xl sm:text-9xl  font-bold text-primary">
                      {countdown}
                    </span>
                  </div>
                </div>
              </div>
            )}

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

export default function SessionRecordPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  return <SessionRecordContent projectId={projectId} />;
}
