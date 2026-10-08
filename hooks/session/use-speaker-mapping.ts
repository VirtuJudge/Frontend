import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiClient, ApiClientError } from "@/lib/api/client";
import {
  PracticeSession,
  TeamMembership,
  SpeakerPreviewInterval,
} from "@/lib/api/types";
import { useOptionalAuth } from "@/features/auth";

export const UNCERTAIN_SPEAKER_VALUE = "__UNCERTAIN__";

export interface SpeakerItem {
  speaker_label: string;
  assigned_user_id: string | null;
  is_uncertain?: boolean;
  preview?: SpeakerPreviewInterval;
}

interface UseSpeakerMappingOptions {
  sessionId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function useSpeakerMapping({
  sessionId,
  onSuccess,
  onCancel,
}: UseSpeakerMappingOptions) {
  const router = useRouter();
  const auth = useOptionalAuth();

  const [session, setSession] = useState<PracticeSession | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMembership[]>([]);
  const [speakers, setSpeakers] = useState<SpeakerItem[]>([]);
  const [sessionVersion, setSessionVersion] = useState<number>(1);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showConflictModal, setShowConflictModal] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const sess = await apiClient.getPracticeSession(sessionId);
      const project = await apiClient.getProject(sess.project_id);
      const membersPage = await apiClient.getTeamMembers(project.team_id);
      const memberList = membersPage.items || [];

      // Verify authorization if user session context exists
      const currentUserId = auth?.user?.id;
      if (currentUserId && memberList.length > 0) {
        const isMember = memberList.some((m) => m.user_id === currentUserId);
        const isCreator =
          sess.created_by === currentUserId || project.created_by === currentUserId;
        if (!isMember && !isCreator) {
          setIsAuthorized(false);
          setLoadError(
            "Only authorized team members can view private transcript previews and map presenters.",
          );
          setIsLoading(false);
          return;
        }
      }

      setIsAuthorized(true);
      setSession(sess);
      setSessionVersion(sess.version || 1);
      setTeamMembers(memberList);

      let detectedList: SpeakerItem[] = [];
      const savedMappingsMap = new Map<string, string | null>();
      if (sess.speaker_mappings && sess.speaker_mappings.length > 0) {
        sess.speaker_mappings.forEach((m) => {
          savedMappingsMap.set(m.speaker_label, (m.user_id || m.member_id) ?? null);
        });
      }

      if (sess.detected_speakers && sess.detected_speakers.length > 0) {
        detectedList = sess.detected_speakers.map((s) => ({
          speaker_label: s.speaker_label,
          assigned_user_id:
            s.assigned_user_id || savedMappingsMap.get(s.speaker_label) || null,
          is_uncertain: false,
          preview: s.preview,
        }));
      } else if (sess.speaker_mappings && sess.speaker_mappings.length > 0) {
        detectedList = sess.speaker_mappings.map((m) => ({
          speaker_label: m.speaker_label,
          assigned_user_id: (m.user_id || m.member_id) ?? null,
          is_uncertain: false,
        }));
      } else if (sess.speaker_labels && sess.speaker_labels.length > 0) {
        detectedList = sess.speaker_labels.map((label) => ({
          speaker_label: label,
          assigned_user_id: savedMappingsMap.get(label) || null,
          is_uncertain: false,
        }));
      } else {
        try {
          const mappings = await apiClient.getSpeakerMappings(sessionId);
          if (mappings && mappings.length > 0) {
            detectedList = mappings.map((m) => ({
              speaker_label: m.speaker_label,
              assigned_user_id: (m.user_id || m.member_id) ?? null,
              is_uncertain: false,
            }));
          }
        } catch {
          // No separate mapping read model or diarization pending
        }
      }

      setSpeakers(detectedList);
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.status === 403) {
        setIsAuthorized(false);
        setLoadError(
          "Forbidden: You are not authorized to view private transcript previews or map speakers for this session.",
        );
      } else {
        setIsAuthorized(true);
        const msg =
          err instanceof Error ? err.message : "Failed to load practice session";
        setLoadError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  }, [auth, sessionId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadData]);

  const handleAssignMember = (speakerLabel: string, userId: string | null) => {
    setSaveError(null);
    setSpeakers((prev) =>
      prev.map((s) => {
        if (s.speaker_label !== speakerLabel) return s;
        if (userId === UNCERTAIN_SPEAKER_VALUE) {
          return {
            ...s,
            assigned_user_id: UNCERTAIN_SPEAKER_VALUE,
            is_uncertain: true,
          };
        }
        return {
          ...s,
          assigned_user_id: userId ? userId : null,
          is_uncertain: false,
        };
      }),
    );
  };

  const duplicateAssignments = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of speakers) {
      if (s.assigned_user_id && s.assigned_user_id !== UNCERTAIN_SPEAKER_VALUE) {
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
      setSaveError(
        "No detected speakers available to map. Please wait for diarization results.",
      );
      return;
    }

    if (hasDuplicateError) {
      setSaveError("Each team member may only be assigned to one speaker label.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    // Only submit confident mappings for actual team members.
    // Unmapped and uncertain speakers remain anonymous without inventing identities.
    const mappingsToSubmit = speakers
      .filter(
        (s) =>
          Boolean(s.assigned_user_id) &&
          s.assigned_user_id !== UNCERTAIN_SPEAKER_VALUE,
      )
      .map((s) => ({
        speaker_label: s.speaker_label,
        user_id: s.assigned_user_id!,
      }));

    try {
      await apiClient.saveSpeakerMappings(
        sessionId,
        mappingsToSubmit,
        sessionVersion,
      );

      if (onSuccess) {
        onSuccess();
      } else {
        router.push(`/sessions/${sessionId}/report`);
      }
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.status === 412) {
        setShowConflictModal(true);
        setSaveError(
          "Mapping conflict detected: The session state was updated by another team member. Please reload latest mappings.",
        );
      } else if (err instanceof ApiClientError && err.status === 409) {
        const code = (err.problem as { code?: string } | undefined)?.code;
        if (code === "analysis_not_ready") {
          setSaveError(
            "Analysis results are not ready for speaker mapping yet. Please wait for diarization.",
          );
        } else {
          setShowConflictModal(true);
          setSaveError(
            "Conflict detected: A newer version of this session exists. Please reload before saving.",
          );
        }
      } else if (err instanceof ApiClientError && err.status === 422) {
        setSaveError(err.message || "Invalid speaker label or team member.");
      } else {
        setSaveError(
          err instanceof Error
            ? err.message
            : "Failed to save speaker mappings. Please try again.",
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.push(`/sessions/${sessionId}/report`);
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
    isAuthorized,
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
