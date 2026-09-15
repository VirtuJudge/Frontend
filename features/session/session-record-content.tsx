"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
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
import {
  saveSessionConfig,
  savePresentationVideo,
  getSessionConfig,
} from "@/lib/storage";
import { ApiClientError, apiClient } from "@/lib/api/client";
import {
  uploadFileDirectly,
  validateFile,
  computeFileChecksum,
  generateIdempotencyKey,
} from "@/lib/upload";

export function SessionRecordContent({ projectId }: { projectId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const timerParam = searchParams.get("timer");
  const pauseParam = searchParams.get("pause");
  const durationParam = searchParams.get("duration");

  const storedConfig = useMemo(() => {
    return getSessionConfig(projectId);
  }, [projectId]);

  const showTimer =
    timerParam !== null
      ? timerParam === "true"
      : (storedConfig?.showTimer ?? true);

  const allowPauses =
    pauseParam !== null
      ? pauseParam === "true"
      : (storedConfig?.allowPauses ?? true);

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [showStartModal, setShowStartModal] = useState(false);
  const [showRestartModal, setShowRestartModal] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isRequesting, setIsRequesting] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const [uploadProgress, setUploadProgress] = useState<{
    stage: string;
    percent: number;
  } | null>(null);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const videoUrlRef = useRef<string | null>(null);
  const isStoppedRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const isRestartingRef = useRef(false);

  const initCamera = useCallback(
    (openModalOnReady = true, startCountdownOnReady = false) => {
      if (isStoppedRef.current) {
        return;
      }

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.ondataavailable = null;
        if (mediaRecorderRef.current.state !== "inactive") {
          try {
            mediaRecorderRef.current.stop();
          } catch {}
        }
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
            if (isRestartingRef.current) return;
            if (event.data && event.data.size > 0) {
              recordedChunksRef.current.push(event.data);
            }
          };

          recorder.onstop = () => {
            if (isRestartingRef.current) {
              return;
            }
            if (recordedChunksRef.current.length > 0) {
              const blob = new Blob(recordedChunksRef.current, {
                type: options.mimeType || "video/webm",
              });
              const url = URL.createObjectURL(blob);
              videoUrlRef.current = url;
              setVideoUrl(url);
              savePresentationVideo(projectId, {
                videoUrl: url,
                fileName: `recording-${Date.now()}.webm`,
              });
            }

            if (mediaStreamRef.current) {
              mediaStreamRef.current
                .getTracks()
                .forEach((track) => track.stop());
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
          } else if (startCountdownOnReady) {
            isRestartingRef.current = false;
            setCountdown(3);
          }
        })
        .catch(() => {
          setHasCamera(false);
          setIsRequesting(false);
          setIsBlocked(true);
          setShowStartModal(false);
        });
    },
    [projectId],
  );

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

    const timer = setTimeout(() => {
      if (countdown > 1) {
        setCountdown(countdown - 1);
      } else {
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
    }, stepMs);

    return () => clearTimeout(timer);
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
        const tracks =
          mediaStreamRef.current.getVideoTracks?.() ??
          mediaStreamRef.current.getTracks?.() ??
          [];
        tracks.forEach((t) => (t.enabled = !next));
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
    setSubmitError(null);
    setUploadProgress(null);
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
    isRestartingRef.current = true;
    setShowRestartModal(false);
    setShowStartModal(false);
    isStoppedRef.current = false;
    hasInitializedRef.current = true;
    setIsRecording(false);
    setIsPaused(false);
    setCountdown(null);

    if (videoUrlRef.current) {
      URL.revokeObjectURL(videoUrlRef.current);
      videoUrlRef.current = null;
    }
    setVideoUrl(null);
    recordedChunksRef.current = [];

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.ondataavailable = null;
      if (mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.stop();
        } catch {}
      }
      mediaRecorderRef.current = null;
    }

    resetTimer(initialDuration);

    const stream = mediaStreamRef.current;
    const hasLiveTracks =
      stream &&
      stream.getTracks &&
      stream.getTracks().length > 0 &&
      stream.getTracks().some((t) => t.readyState !== "ended");

    if (hasLiveTracks && stream) {
      stream.getTracks().forEach((t) => (t.enabled = true));

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
        if (isRestartingRef.current) return;
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        if (isRestartingRef.current) {
          return;
        }
        if (recordedChunksRef.current.length > 0) {
          const blob = new Blob(recordedChunksRef.current, {
            type: options.mimeType || "video/webm",
          });
          const url = URL.createObjectURL(blob);
          videoUrlRef.current = url;
          setVideoUrl(url);
          savePresentationVideo(projectId, {
            videoUrl: url,
            fileName: `recording-${Date.now()}.webm`,
          });
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
      isRestartingRef.current = false;
      setCountdown(3);
    } else {
      setIsRequesting(true);
      setIsBlocked(false);
      initCamera(false, true);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting || !videoUrl) return;

    try {
      setIsSubmitting(true);
      setSubmitError(null);
      setUploadProgress({
        stage: "Preparing presentation video...",
        percent: 5,
      });

      // 1. Get stored session configuration from localStorage
      const config = getSessionConfig(projectId);
      const sessionKey = generateIdempotencyKey("session");

      // 2. Prepare the recorded video file to upload
      let fileToUpload: File;
      if (recordedChunksRef.current && recordedChunksRef.current.length > 0) {
        const mime = recordedChunksRef.current[0].type || "video/webm";
        const ext = mime.includes("mp4") ? ".mp4" : ".webm";
        fileToUpload = new File(
          recordedChunksRef.current,
          `presentation-${Date.now()}${ext}`,
          { type: mime },
        );
      } else {
        try {
          const res = await fetch(videoUrl);
          const blob = await res.blob();
          const mime = blob.type || "video/webm";
          const ext = mime.includes("mp4") ? ".mp4" : ".webm";
          fileToUpload = new File([blob], `presentation-${Date.now()}${ext}`, {
            type: mime,
          });
        } catch {
          fileToUpload = new File([], `presentation-${Date.now()}.webm`, {
            type: "video/webm",
          });
        }
      }

      // Validate video file size and format (max 500 MB, .mp4 or .webm)
      const validation = validateFile(fileToUpload, "presentation_video");
      if (!validation.valid) {
        throw new Error(
          validation.error ||
            "The presentation video must be .mp4 or .webm and under 500 MB.",
        );
      }

      const mediaType = fileToUpload.type.includes("mp4")
        ? "video/mp4"
        : "video/webm";
      const fileName = fileToUpload.name;

      // 3. Compute SHA256 checksum
      setUploadProgress({
        stage: "Calculating video checksum...",
        percent: 15,
      });
      let checksum =
        "sha256:0000000000000000000000000000000000000000000000000000000000000000";
      try {
        checksum = await computeFileChecksum(fileToUpload, (pct) => {
          setUploadProgress({
            stage: "Calculating video checksum...",
            percent: Math.min(25, Math.round(pct * 0.25)),
          });
        });
      } catch (checksumErr) {
        console.warn("Checksum calculation notice:", checksumErr);
      }

      // 4. Create upload intent
      setUploadProgress({ stage: "Requesting upload slot...", percent: 30 });
      const intentKey = generateIdempotencyKey("intent");
      const intent = await apiClient.createUploadIntent(
        projectId,
        {
          file_name: fileName,
          declared_size_bytes: fileToUpload.size || 1024 * 1024,
          declared_media_type: mediaType,
          kind: "presentation_video",
        },
        intentKey,
      );

      const presentationAssetId = intent.asset_id;
      const presentationVersionId = intent.version_id || intent.asset_id;
      let videoPlaybackLink = videoUrl;

      // 5. Upload video file to storage destination
      if (intent.upload_url) {
        setUploadProgress({
          stage: "Uploading presentation video...",
          percent: 35,
        });
        await uploadFileDirectly({
          uploadUrl: intent.upload_url,
          file: fileToUpload,
          headers: intent.required_headers,
          onProgress: (prog) => {
            setUploadProgress({
              stage: `Uploading presentation video (${prog.percentage}%)...`,
              percent: 35 + Math.round(prog.percentage * 0.45),
            });
          },
        });
        videoPlaybackLink = intent.upload_url;
      }

      // 6. Complete upload verification on backend
      setUploadProgress({
        stage: "Completing upload verification...",
        percent: 85,
      });
      const completeKey = generateIdempotencyKey("complete");
      await apiClient.completeUpload(
        presentationAssetId,
        presentationVersionId,
        {
          checksum,
          size_bytes: fileToUpload.size,
        },
        completeKey,
      );

      // 7. Save presentation video details to localStorage under projectId
      savePresentationVideo(projectId, {
        videoUrl,
        link: videoPlaybackLink,
        assetId: presentationAssetId,
        versionId: presentationVersionId,
        fileName,
        uploadedAt: new Date().toISOString(),
      });

      // 8. Create practice session via API with all configurations ready
      setUploadProgress({ stage: "Creating practice session...", percent: 92 });
      const docAssetIds =
        config?.documentAssetIds ||
        config?.selectedAssets?.map((a) => a.assetId || a.id).filter(Boolean) ||
        [];
      const docVersionIds =
        config?.documentVersionIds ||
        config?.selectedAssets
          ?.map((a) => a.versionId)
          .filter((v): v is string => Boolean(v)) ||
        [];

      const session = await apiClient.createPracticeSession(
        projectId,
        {
          name: `Practice Session ${new Date().toLocaleDateString()}`,
          presentation_asset_id: presentationAssetId,
          presentation_asset_version_id: presentationVersionId,
          document_asset_ids: docAssetIds,
          supporting_document_version_ids: docVersionIds,
          policy_version: "1.0",
          rubric: {
            rubric_id: "startup_pitch",
            version: 1,
          },
        },
        sessionKey,
      );

      // Preserve the created session immediately so a failed readiness/analysis
      // command can be resumed without creating a duplicate session.
      saveSessionConfig(projectId, {
        sessionId: session.id,
      });

      setUploadProgress({
        stage: "Preparing session for analysis...",
        percent: 95,
      });

      const sessionUpdate = {
        name:
          session.name ||
          `Practice Session ${new Date().toLocaleDateString()}`,
        presentation_asset_version_id: presentationVersionId,
        supporting_document_version_ids: docVersionIds,
        rubric: {
          rubric_id: "startup_pitch",
          version: 1,
        },
      };
      let readySession;
      try {
        readySession = await apiClient.updatePracticeSession(
          session.id,
          sessionUpdate,
          session.version,
        );
      } catch (error) {
        if (!(error instanceof ApiClientError) || error.status !== 412) {
          throw error;
        }

        // Production can advance the entity version immediately after create.
        // Reconcile with backend-owned state before retrying the idempotent
        // readiness update instead of making the user upload the video again.
        const latestSession = await apiClient.getPracticeSession(session.id);
        readySession =
          latestSession.state === "ready"
            ? latestSession
            : await apiClient.updatePracticeSession(
                session.id,
                sessionUpdate,
                latestSession.version,
              );
      }

      if (readySession.state !== "ready") {
        throw new Error(
          `The practice session could not be prepared for analysis (state: ${readySession.state}).`,
        );
      }

      setUploadProgress({
        stage: "Starting AI analysis...",
        percent: 98,
      });
      const analysisKey = generateIdempotencyKey("analysis");
      try {
        await apiClient.createAnalysisAttempt(session.id, analysisKey);
      } catch {
        // The recording, upload, and ready session are already durable. Open
        // the coordinator so the user can retry analysis without uploading a
        // duplicate presentation asset.
        router.push(`/sessions/${session.id}?analysis=start-failed`);
        return;
      }

      setUploadProgress({
        stage: "Analysis started! Opening session...",
        percent: 100,
      });

      router.push(`/sessions/${session.id}`);
    } catch (err: unknown) {
      console.error("Failed to submit session:", err);
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Failed to upload presentation video and create session",
      );
      setUploadProgress(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-[#111918] overflow-hidden select-none z-50">
      <div className="relative w-full h-full flex items-center justify-center">
        {videoUrl ? (
          /* Recorded Preview & Download Section */
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
                    className="bg-[#00e5cc] h-full transition-all duration-300 rounded-full"
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
              <Button
                onClick={handleRecordAgain}
                className="flex-1"
                disabled={isSubmitting}
              >
                <Icon icon="tabler:rotate" />
                <span>Record Again</span>
              </Button>

              <Button
                variant="primary"
                className="flex-1"
                onClick={handleSubmit}
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
                className="fixed inset-0 flex flex-col items-center justify-center z-50 pointer-events-none"
                aria-live="assertive"
                aria-label={`Recording starts in ${countdown}`}
              >
                <div className="flex flex-col items-center justify-center">
                  <div className="w-36 h-36 sm:w-44 sm:h-44 bg-fg/10 backdrop-blur-md rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(6,249,228,0.4)] transition-all transform scale-100">
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
