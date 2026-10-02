import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Question } from "@/lib/api/types";
import { generateIdempotencyKey } from "@/lib/upload/idempotency";
import { uploadFileDirectly } from "@/lib/upload/direct-uploader";
import { computeFileChecksum } from "@/lib/upload/checksum";
import { AudioRecordingDraft } from "./audio-types";

export interface SubmitAnswerProgress {
  stage: string;
  percent: number;
}

export function useQAMutations(
  sessionId: string,
  activeQuestion: Question | null,
  setAnalyzingQuestionId: (id: string | null) => void,
  queryClient: ReturnType<typeof useQueryClient>
) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [submitProgress, setSubmitProgress] = useState<SubmitAnswerProgress | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const clearActionError = useCallback(() => {
    setActionError(null);
  }, []);

  const submitAnswer = useCallback(
    async (draft: AudioRecordingDraft): Promise<boolean> => {
      if (!activeQuestion) {
        setActionError("No active question found to submit an answer for.");
        return false;
      }

      if (isSubmitting) {
        return false;
      }

      setIsSubmitting(true);
      setActionError(null);
      setSubmitProgress({ stage: "Preparing audio submission...", percent: 10 });

      try {
        const fileExt = draft.mimeType.includes("ogg")
          ? "ogg"
          : draft.mimeType.includes("wav")
          ? "wav"
          : draft.mimeType.includes("mp4")
          ? "mp4"
          : "webm";

        const fileName = `answer-${activeQuestion.id}.${fileExt}`;
        const file = new File([draft.blob], fileName, { type: draft.mimeType });
        const audioSize = draft.sizeBytes || draft.blob.size;

        setSubmitProgress({ stage: "Calculating audio checksum...", percent: 25 });
        const checksum = await computeFileChecksum(file, (pct) => {
          setSubmitProgress({
            stage: "Calculating audio checksum...",
            percent: Math.min(40, 25 + Math.round(pct * 0.15)),
          });
        });

        setSubmitProgress({ stage: "Requesting upload slot...", percent: 45 });
        const intentKey = generateIdempotencyKey("answer-intent");
        const intentRes = await apiClient.createAnswerUploadIntent(
          activeQuestion.id,
          {
            file_name: fileName,
            declared_media_type: draft.mimeType || "audio/webm",
            declared_size_bytes: audioSize,
          },
          intentKey
        );

        const uploadUrl = intentRes.upload_intent.upload_url;
        const answerId = intentRes.answer.id;

        if (uploadUrl) {
          setSubmitProgress({ stage: "Uploading answer audio...", percent: 55 });
          await uploadFileDirectly({
            uploadUrl,
            file: draft.blob,
            headers: intentRes.upload_intent.required_headers,
            onProgress: (prog) => {
              setSubmitProgress({
                stage: `Uploading answer audio (${prog.percentage}%)...`,
                percent: 55 + Math.round(prog.percentage * 0.3),
              });
            },
          });
        }

        const assetVersionId = intentRes.upload_intent.version_id;
        if (!assetVersionId) {
          throw new Error("The answer upload did not return an asset version.");
        }
        setSubmitProgress({ stage: "Verifying answer audio...", percent: 87 });
        const completeKey = generateIdempotencyKey("answer-complete");
        await apiClient.completeUpload(
          intentRes.upload_intent.asset_id,
          assetVersionId,
          {
            checksum,
            size_bytes: audioSize,
          },
          completeKey,
        );

        setSubmitProgress({ stage: "Submitting verified answer...", percent: 90 });
        const submitKey = generateIdempotencyKey("answer-submit");
        await apiClient.submitAnswer(
          answerId,
          {
            checksum,
            size_bytes: audioSize,
          },
          submitKey
        );

        setSubmitProgress({ stage: "Answer submitted successfully!", percent: 100 });

        await queryClient.invalidateQueries({ queryKey: ["qa-round", sessionId] });
        setAnalyzingQuestionId(activeQuestion.id);
        return true;
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : "Failed to upload and submit answer audio.";
        setActionError(msg);
        return false;
      } finally {
        setIsSubmitting(false);
        setSubmitProgress(null);
      }
    },
    [activeQuestion, isSubmitting, sessionId, queryClient, setAnalyzingQuestionId]
  );

  const skipQuestion = useCallback(
    async (reason?: string): Promise<boolean> => {
      if (!activeQuestion) {
        setActionError("No active question found to skip.");
        return false;
      }

      if (isSkipping) return false;

      setIsSkipping(true);
      setActionError(null);

      try {
        const skipKey = generateIdempotencyKey("answer-skip");
        await apiClient.skipAnswer(activeQuestion.id, skipKey, reason);

        await queryClient.invalidateQueries({ queryKey: ["qa-round", sessionId] });
        setAnalyzingQuestionId(activeQuestion.id);
        return true;
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : "Failed to skip question. Please try again.";
        setActionError(msg);
        return false;
      } finally {
        setIsSkipping(false);
      }
    },
    [activeQuestion, isSkipping, sessionId, queryClient, setAnalyzingQuestionId]
  );

  return {
    isSubmitting,
    isSkipping,
    submitProgress,
    actionError,
    submitAnswer,
    skipQuestion,
    clearActionError,
  };
}
