"use client";

import { useState } from "react";
import { Button, Input, Modal, Text, Wrapper } from "@/components";
import { Icon } from "@iconify/react";
import { TeamMembership } from "@/lib/api/types";
import { apiClient } from "@/lib/api/client";

interface ManageMemberModalProps {
  teamId: string;
  teamName?: string;
  member: TeamMembership | null;
  isOpen: boolean;
  onClose: () => void;
  onMemberRemoved: (userId: string) => void;
  onOwnershipTransferred?: (newOwnerUserId: string) => void;
  initialView?: ManageView;
}

type ManageView = "overview" | "remove" | "transfer";

export function ManageMemberModal(props: ManageMemberModalProps) {
  if (!props.isOpen || !props.member) return null;

  return (
    <ManageMemberModalDialog
      key={`${props.member.user_id}-${props.initialView || "overview"}`}
      {...props}
      member={props.member}
    />
  );
}

function ManageMemberModalDialog({
  teamId,
  teamName,
  member,
  isOpen,
  onClose,
  onMemberRemoved,
  onOwnershipTransferred,
  initialView = "overview",
}: Omit<ManageMemberModalProps, "member"> & { member: TeamMembership }) {
  const [view, setView] = useState<ManageView>(initialView);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Remove member state
  const [confirmRemoveChecked, setConfirmRemoveChecked] = useState(false);

  // Transfer ownership GitHub-style confirmation state
  const [step1Checked, setStep1Checked] = useState(false);
  const [step2Checked, setStep2Checked] = useState(false);
  const [typedText, setTypedText] = useState("");

  const requiredConfirmationText = teamName?.trim() || "transfer ownership";

  const handleRemove = async () => {
    try {
      setLoading(true);
      setError(null);
      await apiClient.removeTeamMember(teamId, member.user_id);
      onMemberRemoved(member.user_id);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    try {
      setLoading(true);
      setError(null);
      await apiClient.transferOwnership(teamId, member.user_id);
      onOwnershipTransferred?.(member.user_id);
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to transfer ownership",
      );
    } finally {
      setLoading(false);
    }
  };

  const isTransferReady =
    step1Checked &&
    step2Checked &&
    typedText === requiredConfirmationText &&
    !loading;

  const modalTitle =
    view === "overview"
      ? `Manage a team member`
      : view === "remove"
        ? `Remove Member`
        : `Transfer Ownership`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      titleId="manage-member-modal-title"
      error={error}
      loading={loading}
    >
      {view === "overview" && (
        <div className="flex flex-col gap-5">
          <Text size="sm" className="text-justify">
            Manage the team member{" "}
            <span className="font-semibold text-primary">
              {member.display_name}
            </span>{" "}
            and their access to{" "}
            <span className="font-semibold text-primary">{teamName}</span> team.
            You can transfer ownership of the team to this member or remove them
            from the team entirely. Please proceed with caution, as these
            actions are irreversible and may affect their access to projects,
            data, and other resources.
          </Text>
          <Text size="sm" className="font-semibold text-left">
            Select an action:
          </Text>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setError(null);
                setView("transfer");
              }}
              className="flex flex-1 items-center gap-1.5 w-fit"
            >
              <Icon icon="mdi:crown-outline" className="text-2xl shrink-0" />
              Transfer Ownership
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                setError(null);
                setView("remove");
              }}
              className="flex flex-1 items-center gap-1.5 w-fit"
            >
              <Icon
                icon="mdi:account-remove-outline"
                className="text-2xl shrink-0"
              />
              Remove Member
            </Button>
          </div>
        </div>
      )}

      {view === "transfer" &&
        (initialView === "transfer" ? (
          <div className="flex flex-col items-center gap-8 text-center my-4">
            <Text
              size="sm"
              className="text-foreground/80 leading-relaxed text-center"
            >
              You are going to transfer the ownership of{" "}
              <span className="text-primary font-semibold">
                {teamName}
              </span>{" "}
              to{" "}
              <span className="text-primary font-semibold">
                {member.display_name}
              </span>
              . You will completely lose the ownership of the project and become
              a guest member.{" "}
              <span className="font-bold text-foreground">Are you sure?</span>
            </Text>

            <div className="flex items-center justify-center gap-4">
              <Button
                variant="glass"
                size="sm"
                onClick={onClose}
                disabled={loading}
                className="rounded-full px-8 py-3"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleTransfer}
                disabled={loading}
                loading={loading}
                className="rounded-full px-8 py-3 bg-[#e11d48] text-white font-bold"
              >
                Transfer
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setView("overview");
            }}
            className="text-primary hover:text-fg transition-colors flex items-center gap-1.5 cursor-pointer w-fit"
          >
            <Icon icon="mdi:arrow-left" /> Back to member options
          </button>

          <div className="px-4 flex flex-col gap-2.5">
            <div className="flex items-center gap-2 text-danger-lighter font-bold text-sm">
              <Text as="span" className="font-bold text-danger">
                Warning: Irreversible Ownership Transfer
              </Text>
            </div>
            <Text size="sm" className="text-left">
              You are going to transfer the ownership of{" "}
              <strong>{teamName || "this team"}</strong> to{" "}
              <strong>{member.display_name}</strong>. Upcoming consequences of
              this action include:
            </Text>
            <ul className="list-disc pl-4">
              <li>
                You will lose all owner privileges and your role will become a
                regular member.
              </li>
              <li>
                {member.display_name} will become the primary owner with full
                administrative authority over team settings.
              </li>
              <li>
                This action is irreversible and cannot be undone by you once
                completed. Only the new owner can transfer ownership back to
                you.
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-2">
            <Wrapper
              variant="glass"
              borderGradient="neutral"
              className="p-3 rounded-xl flex gap-2.5 cursor-pointer select-none"
              onClick={() => setStep1Checked(!step1Checked)}
            >
              <input
                type="checkbox"
                checked={step1Checked}
                onChange={(e) => setStep1Checked(e.target.checked)}
                onClick={(e) => e.stopPropagation()}
                className="rounded border-foreground/30 accent-danger"
              />
              <Text size="sm" className="text-foreground/90">
                I understand that I am transferring ownership to{" "}
                <strong>{member.display_name}</strong> and I will be demoted to
                a regular member.
              </Text>
            </Wrapper>

            <Wrapper
              variant="glass"
              borderGradient="neutral"
              className="p-3 rounded-xl flex gap-2.5 cursor-pointer select-none"
              onClick={() => setStep2Checked(!step2Checked)}
            >
              <input
                type="checkbox"
                checked={step2Checked}
                onChange={(e) => setStep2Checked(e.target.checked)}
                onClick={(e) => e.stopPropagation()}
                className="mt-0.5 rounded border-foreground/30 accent-danger"
              />
              <Text size="sm" className="text-foreground/90">
                I understand that this action is irreversible and cannot be
                undone by me once completed.
              </Text>
            </Wrapper>
          </div>

          <Text size="sm" className="text-left pl-4">
            To confirm, type{" "}
            <span className="font-bold text-foreground italic text-danger">
              {requiredConfirmationText}
            </span>{" "}
            in the box below:
          </Text>
          <Input
            id="transfer-confirmation-input"
            value={typedText}
            onChange={(e) => setTypedText(e.target.value)}
            placeholder={requiredConfirmationText}
            disabled={!step1Checked || !step2Checked || loading}
            aria-label="Confirm ownership transfer"
            variant="glass"
            borderGradient="neutral"
            autoComplete="off"
            spellCheck={false}
            className="w-full"
          />

          <div className="flex flex-col gap-2 pt-2">
            <Button
              variant="danger"
              size="sm"
              onClick={handleTransfer}
              disabled={!isTransferReady}
              loading={loading}
              className="w-full uppercase tracking-wider text-wrap"
            >
              Transfer ownership
            </Button>
          </div>
        </div>
      ))}

      {view === "remove" &&
        (initialView === "remove" ? (
          <div className="flex flex-col items-center gap-8 text-center my-4">
            <Text
              size="sm"
              className="text-foreground/80 leading-relaxed text-center"
            >
              You are going to remove{" "}
              <span className="text-primary font-semibold">
                {member.display_name}
              </span>{" "}
              from{" "}
              <span className="text-primary font-semibold">
                {teamName || "Team 1"}
              </span>
              . They will lose access to this team and all projects and session
              inside it.{" "}
              <span className="font-bold text-foreground">Are you sure?</span>
            </Text>

            <div className="flex items-center justify-center gap-4">
              <Button
                variant="glass"
                size="sm"
                onClick={onClose}
                disabled={loading}
                className="rounded-full px-8 py-3"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleRemove}
                disabled={loading}
                loading={loading}
                className="rounded-full px-8 py-3 bg-[#e11d48] text-white font-bold"
                aria-label="Remove member"
              >
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setView("overview");
              }}
              className="text-primary hover:text-fg transition-colors flex items-center gap-1.5 cursor-pointer w-fit"
            >
              <Icon icon="mdi:arrow-left" /> Back to member options
            </button>

            <div className="px-4 flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-danger-lighter font-bold text-sm">
                <Text as="span" className="font-bold text-danger">
                  Warning: Confirm Member Removal
                </Text>
              </div>
              <Text size="sm" className="text-left">
                You are going to remove <strong>{member.display_name}</strong> from{" "}
                <strong>{teamName || "this team"}</strong>. Upcoming consequences of
                this action include:
              </Text>
              <ul className="list-disc pl-4 text-left">
                <li>
                  They will immediately lose access to all projects, practice
                  sessions, and data in this team.
                </li>
                <li>
                  Any active invitations or roles linked to this team will be
                  revoked.
                </li>
                <li>
                  They will require a new invitation from the team owner to rejoin in
                  the future.
                </li>
              </ul>
            </div>

            <div className="flex flex-col gap-2">
              <Wrapper
                variant="glass"
                borderGradient="neutral"
                className="p-3 rounded-xl flex gap-2.5 cursor-pointer select-none"
                onClick={() => setConfirmRemoveChecked(!confirmRemoveChecked)}
              >
                <input
                  type="checkbox"
                  checked={confirmRemoveChecked}
                  onChange={(e) => setConfirmRemoveChecked(e.target.checked)}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded border-foreground/30 accent-danger"
                />
                <Text size="sm" className="text-foreground/90 text-left">
                  I understand that <strong>{member.display_name}</strong> will be
                  removed from the team and lose all access immediately.
                </Text>
              </Wrapper>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button
                variant="danger"
                size="sm"
                onClick={handleRemove}
                disabled={!confirmRemoveChecked || loading}
                loading={loading}
                className="w-full uppercase tracking-wider text-wrap"
              >
                Remove member
              </Button>
            </div>
          </div>
        ))}
    </Modal>
  );
}
