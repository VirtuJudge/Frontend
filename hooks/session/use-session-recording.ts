"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { savePresentationVideo } from "@/lib/storage";
import { useMediaResources } from "./use-media-resources";
import { useRecordingCountdown } from "./use-recording-countdown";
import { useRecordingPause } from "./use-recording-pause";

interface UseSessionRecordingOptions {
  projectId: string;
  isRecording: boolean;
  countdown: number | null;
  setCountdown: Dispatch<SetStateAction<number | null>>;
  setIsRecording: Dispatch<SetStateAction<boolean>>;
  onCameraReady: (openModalOnReady: boolean) => void;
  onCameraBlocked: () => void;
}

/** Owns browser-media setup, recording lifecycle, and the recorded preview. */
export function useSessionRecording(options: UseSessionRecordingOptions) {
  const {
    projectId,
    isRecording,
    countdown,
    setCountdown,
    setIsRecording,
    onCameraReady,
    onCameraBlocked,
  } = options;
  const resources = useMediaResources();
  const {
    mediaStreamRef,
    mediaRecorderRef,
    liveVideoRef,
    recordedChunksRef,
    videoUrlRef,
    stopStream,
    revokeVideoUrl,
  } = resources;
  const [hasCamera, setHasCamera] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isRequesting, setIsRequesting] = useState(true);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const isStoppedRef = useRef(false);
  const isRestartingRef = useRef(false);
  const hasInitializedRef = useRef(false);

  const createRecorder = useCallback(
    (stream: MediaStream) => {
      const recorderOptions: MediaRecorderOptions = {};
      if (
        typeof MediaRecorder !== "undefined" &&
        MediaRecorder.isTypeSupported?.("video/webm")
      ) {
        recorderOptions.mimeType = "video/webm";
      }

      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, recorderOptions);
      } catch {
        recorder = new MediaRecorder(stream);
      }
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (isRestartingRef.current) return;
        if (event.data?.size > 0) recordedChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        if (isRestartingRef.current) return;

        if (recordedChunksRef.current.length > 0) {
          const blob = new Blob(recordedChunksRef.current, {
            type: recorderOptions.mimeType || "video/webm",
          });
          const url = URL.createObjectURL(blob);
          videoUrlRef.current = url;
          setVideoUrl(url);
          savePresentationVideo(projectId, {
            videoUrl: url,
            fileName: `recording-${Date.now()}.webm`,
          });
        }

        stopStream();
        mediaRecorderRef.current = null;
        setIsRecording(false);
        setHasCamera(false);
      };
    },
    [
      mediaRecorderRef,
      projectId,
      recordedChunksRef,
      setIsRecording,
      stopStream,
      videoUrlRef,
    ],
  );

  const initCamera = useCallback(
    (openModalOnReady = true, startCountdownOnReady = false) => {
      if (isStoppedRef.current) return;

      stopStream();
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
      if (liveVideoRef.current?.srcObject) liveVideoRef.current.srcObject = null;
      revokeVideoUrl();
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

          createRecorder(stream);
          setHasCamera(true);
          setIsRequesting(false);
          setIsBlocked(false);
          if (startCountdownOnReady) {
            isRestartingRef.current = false;
            setCountdown(3);
          }
          onCameraReady(openModalOnReady);
        })
        .catch(() => {
          setHasCamera(false);
          setIsRequesting(false);
          setIsBlocked(true);
          onCameraBlocked();
        });
    },
    [
      createRecorder,
      liveVideoRef,
      mediaRecorderRef,
      mediaStreamRef,
      onCameraBlocked,
      onCameraReady,
      recordedChunksRef,
      revokeVideoUrl,
      setCountdown,
      stopStream,
    ],
  );

  const stopRecording = useCallback(() => {
    isStoppedRef.current = true;
    setIsRecording(false);
    setCountdown(null);
    stopStream();

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {}
    }
    setHasCamera(false);
  }, [mediaRecorderRef, setCountdown, setIsRecording, stopStream]);

  const retryCamera = useCallback(() => {
    isStoppedRef.current = false;
    setIsRequesting(true);
    setIsBlocked(false);
    initCamera(true);
  }, [initCamera]);

  const recordAgain = useCallback(() => {
    isStoppedRef.current = false;
    setIsRecording(false);
    setCountdown(null);
    revokeVideoUrl();
    setVideoUrl(null);
    setIsRequesting(true);
    setIsBlocked(false);
    initCamera(true);
  }, [initCamera, revokeVideoUrl, setCountdown, setIsRecording]);

  const pause = useRecordingPause(mediaStreamRef, mediaRecorderRef, isRecording);
  const { setIsPaused } = pause;

  const restartRecording = useCallback(() => {
    isRestartingRef.current = true;
    isStoppedRef.current = false;
    setIsRecording(false);
    setIsPaused(false);
    setCountdown(null);
    revokeVideoUrl();
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

    const stream = mediaStreamRef.current;
    const hasLiveTracks =
      stream?.getTracks().some((track) => track.readyState !== "ended") ?? false;

    if (hasLiveTracks && stream) {
      stream.getTracks().forEach((track) => (track.enabled = true));
      createRecorder(stream);
      setHasCamera(true);
      setIsRequesting(false);
      setIsBlocked(false);
      isRestartingRef.current = false;
      setCountdown(3);
      return;
    }

    setIsRequesting(true);
    setIsBlocked(false);
    initCamera(false, true);
  }, [
    createRecorder,
    initCamera,
    mediaRecorderRef,
    mediaStreamRef,
    recordedChunksRef,
    revokeVideoUrl,
    setIsPaused,
    setCountdown,
    setIsRecording,
  ]);

  useEffect(() => {
    if (!hasInitializedRef.current && !isStoppedRef.current && !videoUrlRef.current) {
      hasInitializedRef.current = true;
      initCamera(true);
    }
    return stopStream;
  }, [initCamera, stopStream, videoUrlRef]);

  useRecordingCountdown({
    countdown,
    recorderRef: mediaRecorderRef,
    setCountdown,
    setIsRecording,
  });

  return {
    ...resources,
    ...pause,
    videoUrl,
    hasCamera,
    isBlocked,
    isRequesting,
    stopRecording,
    retryCamera,
    recordAgain,
    restartRecording,
  };
}
