"use client";

import React, { useEffect } from "react";
import { Icon } from "@iconify/react";
import { Wrapper, Button, Modal, PillBadge, Text } from "@/components";
import { SessionHeader } from "./session-header";
import {
  useSpeakerMapping,
  UNCERTAIN_SPEAKER_VALUE,
} from "@/hooks/session/use-speaker-mapping";

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
  const {
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
  } = useSpeakerMapping({ sessionId, onSuccess, onCancel });

  // Keyboard shortcut: Ctrl+S / Cmd+S to submit mappings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        if (!isSaving && !hasDuplicateError && speakers.length > 0) {
          void handleSubmit();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSubmit, isSaving, hasDuplicateError, speakers.length]);

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="fixed inset-0 w-full h-full bg-[#000f0e] flex items-center justify-center text-white p-4">
        <SessionHeader onNavigate={handleNavigateBack} />
        <div className="flex flex-col items-center gap-4 text-center z-10">
          <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-white/60">
            Loading speaker diarization results...
          </p>
        </div>
      </div>
    );
  }

  // 2. Unauthorized State (Private Previews Restricted)
  if (!isAuthorized) {
    return (
      <div className="fixed inset-0 w-full h-full bg-[#000f0e] flex items-center justify-center text-white p-4">
        <SessionHeader onNavigate={handleNavigateBack} />
        <Wrapper
          variant="glass-dark"
          className="max-w-md w-full p-8 flex flex-col items-center text-center gap-4 z-10 border border-amber-500/20"
        >
          <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Icon icon="tabler:lock" className="text-2xl" />
          </div>
          <Text as="h3" size="lg" className="font-bold">
            Private Previews Restricted
          </Text>
          <Text size="sm" className="text-white/60">
            {loadError ||
              "Private transcript previews and speaker mapping are restricted to authorized team members of this project."}
          </Text>
          <div className="flex gap-3 w-full mt-2">
            <Button
              variant="glass"
              size="sm"
              onClick={handleNavigateBack}
              className="flex-1"
            >
              Go Back
            </Button>
          </div>
        </Wrapper>
      </div>
    );
  }

  // 3. Error State
  if (loadError && !session) {
    return (
      <div className="fixed inset-0 w-full h-full bg-[#000f0e] flex items-center justify-center text-white p-4">
        <SessionHeader onNavigate={handleNavigateBack} />
        <Wrapper
          variant="glass-dark"
          className="max-w-md w-full p-8 flex flex-col items-center text-center gap-4 z-10"
        >
          <div className="w-12 h-12 rounded-full bg-danger/20 border border-danger/30 flex items-center justify-center text-danger">
            <Icon icon="tabler:alert-circle" className="text-2xl" />
          </div>
          <Text as="h3" size="lg">
            Unable to Load Speakers
          </Text>
          <Text size="sm" className="text-white/60">
            {loadError}
          </Text>
          <div className="flex gap-3 w-full mt-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => loadData()}
              className="flex-1"
            >
              Try Again
            </Button>
            <Button
              variant="glass"
              size="sm"
              onClick={handleNavigateBack}
              className="flex-1"
            >
              Go Back
            </Button>
          </div>
        </Wrapper>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#000f0e] text-white flex flex-col items-center justify-start pt-28 pb-20">
      <SessionHeader onNavigate={handleNavigateBack} />

      <div className="w-full max-w-3xl flex flex-col gap-6 z-10">
        <div className="flex flex-wrap justify-center sm:justify-between items-center gap-3">
          <Text as="h2" size="lg" className="text-2xl sm:text-3xl font-bold">
            Map Presenters
          </Text>
          <PillBadge
            variant="glass-dark"
            icon="tabler:users"
            className="text-xs"
          >
            {speakers.length} Speakers Detected
          </PillBadge>
        </div>
        <Text size="xs" className="text-white/70 text-left">
          Confirm who presented each section so individual feedback and
          communication scores are attributed accurately in your evaluation
          report.
        </Text>
        <Wrapper
          variant="glass-dark"
          className="p-4 rounded-2xl flex items-start gap-3 border border-white/10"
        >
          <Icon
            icon="tabler:info-circle"
            className="text-primary text-xl mt-0.5 shrink-0"
          />
          <Text size="xs" className="text-white/80 leading-relaxed text-left">
            <strong>How speaker mapping works:</strong> Each mapped team member
            receives an individual feedback card with personalized delivery
            strengths and improvements. Unmapped and uncertain speakers remain
            anonymous, contributing to team-wide presentation scores without
            creating invented identities.
          </Text>
        </Wrapper>

        {/* Global Save/Validation Error Banner */}
        {saveError && (
          <Wrapper
            variant="danger"
            className="p-4 rounded-2xl flex items-center gap-3"
            role="alert"
          >
            <Icon icon="tabler:alert-triangle" className="text-xl shrink-0" />
            <span className="text-sm font-medium">{saveError}</span>
          </Wrapper>
        )}

        {/* Empty / In-Progress State */}
        {speakers.length === 0 && (
          <Wrapper
            variant="glass"
            className="rounded-3xl p-6 text-center flex flex-col items-center gap-3"
          >
            <Icon icon="tabler:clock" className="text-3xl text-warning/80" />
            <Text as="h4" size="md" className="font-semibold text-white">
              Speaker Detection in Progress
            </Text>
            <Text size="sm" className="text-white/70 max-w-md">
              Diarization results are not available yet. Detected speaker labels
              must be loaded before you can map presenters and view the
              evaluation report.
            </Text>
            <Button
              variant="glass"
              size="sm"
              onClick={() => loadData()}
              className="mt-2"
              aria-label="Refresh diarization results"
            >
              <Icon icon="tabler:refresh" className="text-base" />
              <span>Refresh Diarization Results</span>
            </Button>
          </Wrapper>
        )}

        {/* Speaker Cards List */}
        <div
          className="flex flex-col gap-4"
          role="list"
          aria-label="Detected Speakers List"
        >
          {speakers.map((speaker) => {
            const isAssigned =
              Boolean(speaker.assigned_user_id) &&
              speaker.assigned_user_id !== UNCERTAIN_SPEAKER_VALUE;
            const isUncertain =
              speaker.assigned_user_id === UNCERTAIN_SPEAKER_VALUE;
            const isDuplicate =
              speaker.assigned_user_id &&
              speaker.assigned_user_id !== UNCERTAIN_SPEAKER_VALUE &&
              (duplicateAssignments[speaker.assigned_user_id] || 0) > 1;

            return (
              <Wrapper
                key={speaker.speaker_label}
                variant="glass"
                className={`p-5 rounded-3xl flex flex-col gap-4 transition-all duration-200 ${
                  isDuplicate
                    ? "border border-danger/60"
                    : isUncertain
                      ? "border border-amber-500/40"
                      : "hover:border-primary/40"
                }`}
                role="listitem"
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <PillBadge
                      variant="primary"
                      icon="tabler:microphone"
                      className="text-sm font-bold"
                    >
                      {speaker.speaker_label}
                    </PillBadge>
                    {speaker.preview && (
                      <PillBadge
                        variant="glass-dark"
                        icon="tabler:clock"
                        className="text-xs text-white/70"
                      >
                        {formatTime(speaker.preview.start_ms)} –{" "}
                        {formatTime(speaker.preview.end_ms)}
                      </PillBadge>
                    )}
                  </div>

                  {isAssigned ? (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/20 text-primary flex items-center gap-1">
                      <Icon icon="tabler:check" className="text-sm" />
                      Mapped
                    </span>
                  ) : isUncertain ? (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 flex items-center gap-1">
                      <Icon icon="tabler:help" className="text-sm" />
                      Uncertain (Anonymous)
                    </span>
                  ) : (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-white/10 text-white/50">
                      Unmapped
                    </span>
                  )}
                </div>

                {/* Authorized Preview Segment Text */}
                {isAuthorized && speaker.preview?.quote_text && (
                  <div className="bg-black/30 p-3.5 rounded-2xl border border-white/5 flex flex-col gap-1">
                    <span className="text-[11px] uppercase tracking-wider text-white/40 flex items-center gap-1.5">
                      <Icon
                        icon="tabler:lock"
                        className="text-xs text-white/40"
                      />
                      Authorized Transcript Preview
                    </span>
                    <blockquote
                      tabIndex={0}
                      aria-label={`Authorized transcript preview for ${speaker.speaker_label}`}
                      className="text-sm text-white/90 italic focus:outline-none focus:ring-1 focus:ring-primary rounded p-1"
                    >
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
                        e.target.value ? e.target.value : null,
                      )
                    }
                    className={`h-11 px-4 rounded-xl bg-white/5 border text-sm text-white outline-none transition-all cursor-pointer focus:ring-2 ${
                      isDuplicate
                        ? "border-danger focus:ring-danger focus:border-danger"
                        : "border-white/10 hover:border-white/20 focus:ring-primary focus:border-primary"
                    }`}
                    aria-label={`Select presenter for ${speaker.speaker_label}`}
                  >
                    <option value="" className="bg-[#001f1d] text-white/60">
                      -- Leave Unmapped (Anonymous) --
                    </option>
                    <option
                      value={UNCERTAIN_SPEAKER_VALUE}
                      className="bg-[#001f1d] text-amber-300"
                    >
                      -- Uncertain (Remain Anonymous) --
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

                  {isUncertain && (
                    <span className="text-xs text-amber-300/80 flex items-center gap-1 mt-0.5">
                      <Icon
                        icon="tabler:info-circle"
                        className="text-xs shrink-0"
                      />
                      Marked as uncertain. This speaker will remain anonymous in
                      the final report.
                    </span>
                  )}
                </div>
              </Wrapper>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-white/10">
          <div className="flex flex-wrap items-center justify-center gap-3 w-full">
            <Button
              variant="glass"
              size="sm"
              onClick={handleSkip}
              disabled={isSaving || speakers.length === 0}
              className="w-full max-w-50 flex-1"
            >
              <Icon icon="material-symbols:forward-rounded" />
              <span>Skip for now</span>
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              loading={isSaving}
              disabled={isSaving || hasDuplicateError || speakers.length === 0}
              className="w-full max-w-50 flex-1"
            >
              <Icon icon="tabler:device-floppy" className="text-xl" />
              <span>Save Mappings</span>
            </Button>
          </div>
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
          <Icon
            icon="tabler:alert-triangle"
            className="text-warning text-xl shrink-0 mt-0.5"
          />
          <p>
            To prevent overwriting changes made by your teammate, please reload
            the latest canonical state before saving your mappings.
          </p>
        </div>
      </Modal>
    </div>
  );
}
