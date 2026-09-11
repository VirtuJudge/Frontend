"use client";

import { useState } from "react";
import { Button, Modal, Text, Wrapper } from "@/components";
import { Icon } from "@iconify/react";
import { TeamInvitation } from "@/lib/api/types";
import { apiClient, ApiClientError } from "@/lib/api/client";

interface ManageInvitationModalProps {
  teamId: string;
  invitation: TeamInvitation | null;
  isOpen: boolean;
  onClose: () => void;
  onInvitationUpdated: () => void;
}

type ManageInvitationView = "overview" | "revoke";

export function ManageInvitationModal(props: ManageInvitationModalProps) {
  if (!props.isOpen || !props.invitation) return null;

  return (
    <ManageInvitationModalDialog
      key={props.invitation.id}
      {...props}
      invitation={props.invitation}
    />
  );
}

function ManageInvitationModalDialog({
  teamId,
  invitation,
  isOpen,
  onClose,
  onInvitationUpdated,
}: Omit<ManageInvitationModalProps, "invitation"> & {
  invitation: TeamInvitation;
}) {
  const [view, setView] = useState<ManageInvitationView>("overview");
  const [resending, setResending] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [confirmRevokeChecked, setConfirmRevokeChecked] = useState(false);

  const handleResend = async () => {
    try {
      setResending(true);
      setError(null);
      setSuccessMessage(null);
      const idempotencyKey = `resend-${Date.now()}`;
      await apiClient.resendInvitation(teamId, invitation.id, idempotencyKey);
      setSuccessMessage("Invitation email resent successfully!");
      onInvitationUpdated();
      setTimeout(() => {
        setSuccessMessage(null);
      }, 2500);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to resend invitation",
      );
    } finally {
      setResending(false);
    }
  };

  const handleRevoke = async () => {
    try {
      setRevoking(true);
      if (invitation.etag) {
        await apiClient.revokeInvitation(teamId, invitation.id, invitation.etag);
      } else {
        await apiClient.revokeInvitation(teamId, invitation.id);
      }
      onInvitationUpdated();
      onClose();
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        if (err.status === 404) {
          setError("Invitation not found or has already been removed.");
          return;
        }
        if (err.status === 409) {
          setError("This invitation is no longer pending.");
          return;
        }
        if (err.status === 412) {
          setError("Invitation state conflict. Please refresh and try again.");
          return;
        }
      }
      setError(
        err instanceof Error ? err.message : "Failed to revoke invitation",
      );
    } finally {
      setRevoking(false);
    }
  };

  const modalTitle =
    view === "overview" ? "Manage Invitation" : "Revoke Invitation";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      titleId="manage-invitation-modal-title"
      error={error}
      loading={resending || revoking}
      className="w-full max-w-xl max-h-[80vh] overflow-y-auto"
    >
      {successMessage && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm">
          {successMessage}
        </div>
      )}

      {view === "overview" && (
        <div className="flex flex-col gap-5">
          <Text size="sm" className="text-justify">
            Manage the pending invitation sent to{" "}
            <span className="font-semibold text-primary truncate">
              {invitation.email}
            </span>
            . You can trigger an email resend with a new secure token, or revoke
            the invitation if access is no longer required.
          </Text>

          <div className="flex  w-full justify-between items-center gap-2">
            <Text size="sm" className="italic">
              Expires on:
            </Text>
            <Text size="sm" className="italic">
              {new Date(invitation.expires_at).toLocaleDateString()}{" "}
              {new Date(invitation.expires_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </div>

          <Text size="sm" className="font-semibold text-left">
            Select an action:
          </Text>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={handleResend}
              loading={resending}
              className="flex flex-1 items-center justify-center gap-1.5"
            >
              <Icon
                icon="mdi:email-sync-outline"
                className="text-2xl shrink-0"
              />
              Resend Email
            </Button>

            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                setError(null);
                setView("revoke");
              }}
              className="flex flex-1 items-center justify-center gap-1.5"
            >
              <Icon
                icon="mdi:close-circle-outline"
                className="text-2xl shrink-0"
              />
              Revoke
            </Button>
          </div>
        </div>
      )}

      {view === "revoke" && (
        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setView("overview");
            }}
            className="text-primary hover:text-fg transition-colors flex items-center gap-1.5 cursor-pointer w-fit"
          >
            <Icon icon="mdi:arrow-left" /> Back to invitation options
          </button>

          <div className="px-4 flex flex-col gap-2.5">
            <div className="flex items-center gap-2 text-danger-lighter font-bold text-sm">
              <Text as="span" className="font-bold text-danger">
                Warning: Revoke Invitation
              </Text>
            </div>
            <Text size="sm" className="text-left">
              You are about to revoke the pending invitation for{" "}
              <strong>{invitation.email}</strong>. Upcoming consequences:
            </Text>
            <ul className="list-disc pl-4 text-left text-sm">
              <li>
                The invitation link and token will become immediately invalid.
              </li>
              <li>
                The recipient will no longer be able to accept or join the team
                using this invitation.
              </li>
              <li>You can issue a new invitation at any time if needed.</li>
            </ul>
          </div>

          <div className="flex flex-col gap-2">
            <Wrapper
              variant="glass"
              borderGradient="neutral"
              className="p-3 rounded-xl flex gap-2.5 cursor-pointer select-none"
              onClick={() => setConfirmRevokeChecked(!confirmRevokeChecked)}
            >
              <input
                type="checkbox"
                checked={confirmRevokeChecked}
                onChange={(e) => setConfirmRevokeChecked(e.target.checked)}
                onClick={(e) => e.stopPropagation()}
                className="rounded border-foreground/30 accent-danger"
              />
              <Text size="sm" className="text-foreground/90 text-left">
                I understand that this invitation will be permanently revoked.
              </Text>
            </Wrapper>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button
              variant="danger"
              size="sm"
              onClick={handleRevoke}
              disabled={!confirmRevokeChecked || revoking}
              loading={revoking}
              className="w-full uppercase tracking-wider text-wrap"
            >
              Revoke invitation
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
