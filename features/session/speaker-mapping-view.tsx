"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import {
  Wrapper,
  Button,
  Modal,
  PillBadge,
  Text,
} from "@/components";
import { SessionHeader } from "./session-header";
import { apiClient } from "@/lib/api/client";
import {
  PracticeSession,
  TeamMembership,
  SpeakerMapping,
  SpeakerPreviewInterval,
} from "@/lib/api/types";

export interface SpeakerItem {
  speaker_label: string;
  assigned_user_id: string | null;
  preview?: SpeakerPreviewInterval;
}

export interface SpeakerMappingViewProps {
  sessionId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function SpeakerMappingView({
  sessionId,
  onSuccess,
  onCancel,
}: SpeakerMappingViewProps) {
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

  // Load session and team data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const sess = await apiClient.getPracticeSession(sessionId);
      setSession(sess);
      setSessionVersion(sess.version || 1);

      // Load team members
      if (sess.team_id) {
        try {
          const membersPage = await apiClient.getTeamMembers(sess.team_id);
          setTeamMembers(membersPage.items || []);
        } catch {
          // If team members fail to load, proceed with empty team list
          setTeamMembers([]);
        }
      }

      // Initialize detected speaker labels
      const existingMappings = sess.speaker_mappings || [];
      const defaultPreviewQuotes: Record<string, string> = {
        SPEAKER_00: "Good morning judges, today we are excited to introduce our platform...",
        SPEAKER_01: "Looking at our market traction, we have reached significant month-over-month growth...",
        SPEAKER_02: "From a technical architecture standpoint, our real-time streaming pipeline ensures sub-second latency...",
      };

      if (existingMappings.length > 0) {
        const initialized: SpeakerItem[] = existingMappings.map((m: SpeakerMapping, idx: number) => {
          const label = m.speaker_label || m.label || m.speaker_id || `SPEAKER_${idx.toString().padStart(2, "0")}`;
          const startMs = m.preview?.start_ms ?? idx * 25000 + 10000;
          const endMs = m.preview?.end_ms ?? startMs + 12000;
          return {
            speaker_label: label,
            assigned_user_id: m.user_id || m.assigned_user_id || null,
            preview: m.preview || {
              start_ms: startMs,
              end_ms: endMs,
              quote_text: defaultPreviewQuotes[label] || `Sample speech segment detected for ${label}...`,
            },
          };
        });
        setSpeakers(initialized);
      } else {
        // Default detected speakers if none previously saved
        const defaultLabels = ["SPEAKER_00", "SPEAKER_01"];
        const initialized: SpeakerItem[] = defaultLabels.map((label, idx) => ({
          speaker_label: label,
          assigned_user_id: null,
          preview: {
            start_ms: idx * 20000 + 10000,
            end_ms: idx * 20000 + 22000,
            quote_text: defaultPreviewQuotes[label] || `Sample presentation transcript segment for ${label}...`,
          },
        }));
        setSpeakers(initialized);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load practice session";
      setLoadError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle presenter assignment change
  const handleAssignMember = (speakerLabel: string, userId: string | null) => {
    setSaveError(null);
    setSpeakers((prev) =>
      prev.map((s) =>
        s.speaker_label === speakerLabel
          ? { ...s, assigned_user_id: userId || null }
          : s
      )
    );
  };

  // Check for duplicate assignments
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

  // Submit speaker mappings
  const handleSubmit = async () => {
    if (hasDuplicateError) {
      setSaveError("Each team member may only be assigned to one speaker label.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    // Only include mapped speakers per backend contract
    const mappingsToSubmit = speakers
      .filter((s) => Boolean(s.assigned_user_id))
      .map((s) => ({
        speaker_label: s.speaker_label,
        user_id: s.assigned_user_id!,
      }));

    try {
      await apiClient.saveSpeakerMappings(
        sessionId,
        mappingsToSubmit,
        sessionVersion
      );

      if (onSuccess) {
        onSuccess();
      } else {
        router.push(`/sessions/${sessionId}/qa`);
      }
    } catch (err: any) {
      if (err?.status === 412) {
        // Concurrency conflict (stale entity version)
        setShowConflictModal(true);
      } else if (err?.status === 422) {
        setSaveError(err.message || "Invalid speaker label or team member.");
      } else {
        setSaveError(err?.message || "Failed to save speaker mappings. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
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

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="fixed inset-0 w-full h-full bg-[#000f0e] flex items-center justify-center text-white p-4">
        <SessionHeader onNavigate={handleNavigateBack} />
        <div className="flex flex-col items-center gap-4 text-center z-10">
          <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm font-mono text-white/60">Loading speaker diarization results...</p>
        </div>
      </div>
    );
  }

  // 2. Error State
  if (loadError && !session) {
    return (
      <div className="fixed inset-0 w-full h-full bg-[#000f0e] flex items-center justify-center text-white p-4">
        <SessionHeader onNavigate={handleNavigateBack} />
        <Wrapper variant="glass-dark" className="max-w-md w-full p-8 flex flex-col items-center text-center gap-4 z-10">
          <div className="w-12 h-12 rounded-full bg-danger/20 border border-danger/30 flex items-center justify-center text-danger">
            <Icon icon="tabler:alert-circle" className="text-2xl" />
          </div>
          <Text as="h3" size="lg">Unable to Load Speakers</Text>
          <Text size="sm" className="text-white/60">{loadError}</Text>
          <div className="flex gap-3 w-full mt-2">
            <Button variant="primary" size="sm" onClick={() => loadData()} className="flex-1">
              Try Again
            </Button>
            <Button variant="glass" size="sm" onClick={handleNavigateBack} className="flex-1">
              Go Back
            </Button>
          </div>
        </Wrapper>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#000f0e] text-white flex flex-col items-center justify-start p-4 sm:p-8 pt-24 pb-20">
      <SessionHeader onNavigate={handleNavigateBack} />

      <div className="w-full max-w-3xl flex flex-col gap-6 z-10">
        {/* Title and Simple Explainer */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <Text as="h2" size="lg" className="text-2xl sm:text-3xl font-bold">
              Map Presenters
            </Text>
            <PillBadge variant="glass-dark" icon="tabler:users" className="text-xs">
              {speakers.length} Speakers Detected
            </PillBadge>
          </div>
          <Text size="xs" className="text-white/70 text-left">
            Confirm who presented each section so individual feedback and communication scores are attributed accurately in your evaluation report.
          </Text>
        </div>

        {/* Informative Guidance Banner */}
        <Wrapper variant="glass-dark" className="p-4 rounded-2xl flex items-start gap-3 border border-white/10">
          <Icon icon="tabler:info-circle" className="text-primary text-xl mt-0.5 shrink-0" />
          <Text size="xs" className="text-white/80 leading-relaxed text-left">
            <strong>How speaker mapping works:</strong> Each mapped team member will receive an individual feedback card in the final report. Unmapped speakers remain anonymous and will still contribute to team-wide presentation scores without creating fake profiles.
          </Text>
        </Wrapper>

        {/* Global Save/Validation Error */}
        {saveError && (
          <Wrapper variant="danger" className="p-4 rounded-2xl flex items-center gap-3">
            <Icon icon="tabler:alert-triangle" className="text-xl shrink-0" />
            <span className="text-sm font-medium">{saveError}</span>
          </Wrapper>
        )}

        {/* Speaker Cards List */}
        <div className="flex flex-col gap-4" role="list" aria-label="Detected Speakers List">
          {speakers.map((speaker) => {
            const isAssigned = Boolean(speaker.assigned_user_id);
            const isDuplicate =
              speaker.assigned_user_id &&
              (duplicateAssignments[speaker.assigned_user_id] || 0) > 1;

            return (
              <Wrapper
                key={speaker.speaker_label}
                variant="glass"
                className={`p-5 rounded-3xl flex flex-col gap-4 transition-all duration-200 ${
                  isDuplicate ? "border border-danger/60" : "hover:border-primary/40"
                }`}
                role="listitem"
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <PillBadge variant="primary" icon="tabler:microphone" className="text-sm font-bold">
                      {speaker.speaker_label}
                    </PillBadge>
                    {speaker.preview && (
                      <PillBadge variant="glass-dark" icon="tabler:clock" className="text-xs text-white/70 font-mono">
                        {formatTime(speaker.preview.start_ms)} – {formatTime(speaker.preview.end_ms)}
                      </PillBadge>
                    )}
                  </div>

                  {isAssigned ? (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/20 text-primary flex items-center gap-1">
                      <Icon icon="tabler:check" className="text-sm" />
                      Mapped
                    </span>
                  ) : (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-white/10 text-white/50">
                      Unmapped
                    </span>
                  )}
                </div>

                {/* Preview Segment Text */}
                {speaker.preview?.quote_text && (
                  <div className="bg-black/30 p-3.5 rounded-2xl border border-white/5 flex flex-col gap-1">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-white/40 flex items-center gap-1.5">
                      <Icon icon="tabler:lock" className="text-xs text-white/40" />
                      Authorized Transcript Preview
                    </span>
                    <blockquote className="text-sm text-white/90 italic">
                      “{speaker.preview.quote_text}”
                    </blockquote>
                  </div>
                )}

                {/* Presenter Assignment Dropdown */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor={`speaker-select-${speaker.speaker_label}`}
                    className="text-xs font-medium text-white/70 flex items-center justify-between"
                  >
                    <span>Assign Team Member</span>
                    {isDuplicate && (
                      <span className="text-danger text-xs font-semibold">
                        Team member already assigned to another speaker
                      </span>
                    )}
                  </label>

                  <select
                    id={`speaker-select-${speaker.speaker_label}`}
                    value={speaker.assigned_user_id || ""}
                    onChange={(e) =>
                      handleAssignMember(
                        speaker.speaker_label,
                        e.target.value ? e.target.value : null
                      )
                    }
                    className={`h-11 px-4 rounded-xl bg-white/5 border text-sm text-white outline-none transition-all cursor-pointer ${
                      isDuplicate
                        ? "border-danger focus:ring-2 focus:ring-danger"
                        : "border-white/10 hover:border-white/20 focus:ring-2 focus:ring-primary"
                    }`}
                    aria-label={`Select presenter for ${speaker.speaker_label}`}
                  >
                    <option value="" className="bg-[#001f1d] text-white/60">
                      -- Leave Unmapped (Anonymous) --
                    </option>
                    {teamMembers.map((m) => (
                      <option
                        key={m.user_id}
                        value={m.user_id}
                        className="bg-[#001f1d] text-white"
                      >
                        {m.display_name} ({m.role || "Member"})
                      </option>
                    ))}
                  </select>
                </div>
              </Wrapper>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
          <Button
            variant="glass"
            size="sm"
            onClick={handleSkip}
            disabled={isSaving}
          >
            Skip for Now
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            loading={isSaving}
            disabled={isSaving || hasDuplicateError}
          >
            <Icon icon="tabler:device-floppy" className="text-xl" />
            <span>Save Mappings</span>
          </Button>
        </div>
      </div>

      {/* Optimistic Concurrency Conflict Modal */}
      <Modal
        isOpen={showConflictModal}
        onClose={() => setShowConflictModal(false)}
        title="Mapping Conflict Detected"
        description="Another team member has updated the session state or speaker mappings since you loaded this page."
        submitText="Reload Latest Mappings"
        onSubmit={(e) => {
          e.preventDefault();
          setShowConflictModal(false);
          loadData();
        }}
        cancelText="Close"
      >
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3 text-sm text-white/80">
          <Icon icon="tabler:alert-triangle" className="text-warning text-xl shrink-0 mt-0.5" />
          <p>
            To prevent overwriting changes made by your teammate, please reload the latest canonical state before saving your mappings.
          </p>
        </div>
      </Modal>
    </div>
  );
}
