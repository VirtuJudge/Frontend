import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiClient, ApiClientError } from "@/lib/api/client";
import { PracticeSession, TeamMembership, SpeakerPreviewInterval } from "@/lib/api/types";

export interface SpeakerItem {
  speaker_label: string;
  assigned_user_id: string | null;
  preview?: SpeakerPreviewInterval;
}

interface UseSpeakerMappingOptions {
  sessionId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function useSpeakerMapping({ sessionId, onSuccess, onCancel }: UseSpeakerMappingOptions) {
  const router = useRouter();

  const [session, setSession] = useState<PracticeSession | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMembership[]>([]);
  const [speakers, setSpeakers] = useState<SpeakerItem[]>([]);
  const [sessionVersion, setSessionVersion] = useState<number>(1);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showConflictModal, setShowConflictModal] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const sess = await apiClient.getPracticeSession(sessionId);
      setSession(sess);
      setSessionVersion(sess.version || 1);

      const project = await apiClient.getProject(sess.project_id);
      const membersPage = await apiClient.getTeamMembers(project.team_id);
      setTeamMembers(membersPage.items || []);

      let detectedList: SpeakerItem[] = [];
      if (sess.detected_speakers && sess.detected_speakers.length > 0) {
        detectedList = sess.detected_speakers.map((s) => ({
          speaker_label: s.speaker_label,
          assigned_user_id: s.assigned_user_id || null,
          preview: s.preview,
        }));
      } else if (sess.speaker_mappings && sess.speaker_mappings.length > 0) {
        detectedList = sess.speaker_mappings.map((m) => ({
          speaker_label: m.speaker_label,
          assigned_user_id: (m.user_id || m.member_id) ?? null,
        }));
      } else {
        try {
          const mappings = await apiClient.getSpeakerMappings(sessionId);
          if (mappings && mappings.length > 0) {
            detectedList = mappings.map((m) => ({
              speaker_label: m.speaker_label,
              assigned_user_id: (m.user_id || m.member_id) ?? null,
            }));
          }
        } catch {
          // No separate mapping read model or diarization pending
        }
      }

      setSpeakers(detectedList);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load practice session";
      setLoadError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadData]);

  const handleAssignMember = (speakerLabel: string, userId: string | null) => {
    setSaveError(null);
    setSpeakers((prev) =>
      prev.map((s) =>
        s.speaker_label === speakerLabel ? { ...s, assigned_user_id: userId || null } : s
      )
    );
  };

  const duplicateAssignments = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of speakers) {
      if (s.assigned_user_id) {
        counts[s.assigned_user_id] = (counts[s.assigned_user_id] || 0) + 1;
      }
    }
    return counts;
  }, [speakers]);

  const hasDuplicateError = useMemo(() => {
    return Object.values(duplicateAssignments).some((count) => count > 1);
  }, [duplicateAssignments]);

  const handleSubmit = async () => {
    if (speakers.length === 0) {
      setSaveError("No detected speakers available to map. Please wait for diarization results.");
      return;
    }

    if (hasDuplicateError) {
      setSaveError("Each team member may only be assigned to one speaker label.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    const mappingsToSubmit = speakers
      .filter((s) => Boolean(s.assigned_user_id))
      .map((s) => ({
        speaker_label: s.speaker_label,
        user_id: s.assigned_user_id!,
      }));

    try {
      await apiClient.saveSpeakerMappings(sessionId, mappingsToSubmit, sessionVersion);

      if (onSuccess) {
        onSuccess();
      } else {
        router.push(`/sessions/${sessionId}/qa`);
      }
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.status === 412) {
        setShowConflictModal(true);
      } else if (err instanceof ApiClientError && err.status === 422) {
        setSaveError(err.message || "Invalid speaker label or team member.");
      } else {
        setSaveError(
          err instanceof Error ? err.message : "Failed to save speaker mappings. Please try again."
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    if (speakers.length === 0) {
      setSaveError("Cannot proceed to Q&A until detected speakers are available.");
      return;
    }

    if (onCancel) {
      onCancel();
    } else {
      router.push(`/sessions/${sessionId}/qa`);
    }
  };

  const handleNavigateBack = () => {
    if (session?.project_id) {
      router.push(`/projects/${session.project_id}`);
    } else {
      router.push("/me");
    }
  };

  return {
    session,
    teamMembers,
    speakers,
    isLoading,
    isSaving,
    loadError,
    saveError,
    showConflictModal,
    duplicateAssignments,
    hasDuplicateError,
    loadData,
    handleAssignMember,
    handleSubmit,
    handleSkip,
    handleNavigateBack,
    setShowConflictModal,
  };
}
