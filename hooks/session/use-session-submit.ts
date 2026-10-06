import { useState } from "react";
import { useRouter } from "next/navigation";
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

export interface UseSessionSubmitProps {
  projectId: string;
  videoUrl: string | null;
  recordedChunksRef: React.MutableRefObject<Blob[]>;
}

export function useSessionSubmit({
  projectId,
  videoUrl,
  recordedChunksRef,
}: UseSessionSubmitProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{
    stage: string;
    percent: number;
  } | null>(null);

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
      // Persist asset & version identifiers; do not store presigned PUT upload URLs as playback links
      savePresentationVideo(projectId, {
        videoUrl,
        assetId: presentationAssetId,
        versionId: presentationVersionId,
        fileName,
        fileSize: fileToUpload.size,
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

  return {
    isSubmitting,
    submitError,
    uploadProgress,
    setSubmitError,
    setUploadProgress,
    handleSubmit,
  };
}
