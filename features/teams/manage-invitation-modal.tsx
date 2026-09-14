"use client";

import { useState } from "react";
import { Button, Modal, Text } from "@/components";
import { Icon } from "@iconify/react";
import { TeamInvitation } from "@/lib/api/types";
import { apiClient, ApiClientError } from "@/lib/api/client";

interface ManageInvitationModalProps {
  teamId: string;
  teamName: string;
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
  teamName,
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
        await apiClient.revokeInvitation(
          teamId,
          invitation.id,
          invitation.etag,
        );
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
            <span
              className="text-primary inline-block max-w-[25ch] sm:max-w-[40ch] truncate align-bottom"
              title={invitation.email}
            >
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

          <div className="flex items-center justify-center gap-4">
            <Button
              variant="primary"
              size="sm"
              onClick={handleResend}
              loading={resending}
              className="flex flex-1 items-center justify-center gap-1.5 max-w-52"
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
              className="flex flex-1 items-center justify-center gap-1.5 max-w-52"
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
          <div className="px-4 flex flex-col gap-2.5">
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

            <Text size="sm" className="text-left">
              You are going to revoke the pending invitation of{" "}
              <span
                className="text-primary inline-block max-w-[25ch] sm:max-w-[40ch] truncate align-bottom"
                title={invitation.email}
              >
                {invitation.email}
              </span>{" "}
              for <span className="text-primary">{teamName}</span>. Are you
              sure?
            </Text>
          </div>

          <div className="flex items-center justify-center gap-4">
            <Button
              size="sm"
              onClick={onClose}
              className="rounded-full px-8 py-3"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleRevoke}
              disabled={revoking}
              loading={revoking}
              className="rounded-full px-8 py-3"
            >
              Revoke
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
