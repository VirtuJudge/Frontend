"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Icon } from "@iconify/react";
import {
  Wrapper,
  Text,
  ListRowCard,
  PillBadge,
  ActionAddButton,
  ActionIconButton,
} from "@/components";
import { WorkspaceNavBar } from "@/components/Nav-Bar";
import {
  UploadAssetModal,
  DeleteAssetModal,
  CancelSessionModal,
} from "@/features/projects";
import { apiClient } from "@/lib/api/client";
import { Asset, PracticeSession } from "@/lib/api/types";
import LoadingPage from "@/app/loading";
import NotFoundPage from "@/app/not-found";

export function FileTypeBadge({
  fileName,
  mediaType,
}: {
  fileName?: string;
  mediaType?: string;
}) {
  const name = (fileName || "").toLowerCase();
  const isPptx =
    name.endsWith(".pptx") ||
    name.endsWith(".ppt") ||
    mediaType?.includes("presentation");
  const isPdf = name.endsWith(".pdf") || mediaType?.includes("pdf");

  const icon = isPptx
    ? "tabler:file-type-ppt"
    : isPdf
      ? "tabler:file-type-pdf"
      : "tabler:file-text";

  const label = isPptx ? "PPT" : isPdf ? "PDF" : "DOC";

  return (
    <div
      className="w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-foreground/80 shrink-0"
      title={`${label} file`}
      aria-label={`${label} file`}
    >
      <Icon icon={icon} className="text-2xl" />
    </div>
  );
}

export function ProjectDetailsContent({ projectId }: { projectId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const [sessionToCancel, setSessionToCancel] = useState<PracticeSession | null>(
    null,
  );

  const { data: project, isLoading: isProjectLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => apiClient.getProject(projectId),
  });

  const teamId = project?.team_id;

  const { isLoading: isTeamLoading } = useQuery({
    queryKey: ["team", teamId],
    queryFn: () => apiClient.getTeam(teamId!),
    enabled: !!teamId,
  });

  const { data: assetsPage, isLoading: isAssetsLoading } = useQuery({
    queryKey: ["projectAssets", projectId],
    queryFn: () => apiClient.getAssets(projectId),
    enabled: !!projectId,
  });

  const { data: sessionsPage, isLoading: isSessionsLoading } = useQuery({
    queryKey: ["projectSessions", projectId],
    queryFn: () => apiClient.getPracticeSessions(projectId),
    enabled: !!projectId,
  });

  if (
    isProjectLoading ||
    (teamId && isTeamLoading) ||
    isAssetsLoading ||
    isSessionsLoading
  ) {
    return <LoadingPage />;
  }

  if (!project) {
    return <NotFoundPage />;
  }

  const rawAssets = assetsPage?.items || [];
  // Filter supporting document assets (only PDF and PPTX)
  const assets = rawAssets.filter((a) => {
    if (a.state !== "verified") return false;
    const name = (a.file_name || "").toLowerCase();
    const isSupported =
      name.endsWith(".pdf") ||
      name.endsWith(".pptx") ||
      a.kind === "supporting_document";
    return isSupported;
  });

  const sessions = sessionsPage?.items || [];

  const handleDownloadAsset = async (asset: Asset) => {
    try {
      const intent = await apiClient.createDownloadIntent(asset.id);
      if (intent?.download_url && typeof window !== "undefined") {
        const link = document.createElement("a");
        link.href = intent.download_url;
        link.download = intent.file_name || asset.file_name;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch {
      // Fallback
    }
  };

  const handleAssetUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ["projectAssets", projectId] });
  };

  const handleSessionUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ["projectSessions", projectId] });
  };

  const sessionCancelIndex = sessionToCancel
    ? sessions.findIndex((s) => s.id === sessionToCancel.id) + 1 || 1
    : 1;

  return (
    <div className="flex flex-col items-center justify-center w-full gap-10 pt-20 lg:pt-0">
      {/* Top Header Navbar containing team and project name */}
      <WorkspaceNavBar
        selectedProjectId={projectId}
        selectedTeamId={teamId}
      />

      <div className="w-full max-w-4xl flex flex-col gap-24">
        {/* ================= Assets Section ================= */}
        <div className="flex flex-col items-center w-full gap-8">
          <Text className="text-3xl font-bold text-fg-light">Assets</Text>

          <div className="w-full flex flex-col gap-4">
            {assets.length === 0 ? (
              <Wrapper className="rounded-full py-6 text-center text-foreground/60">
                No assets yet
              </Wrapper>
            ) : (
              assets.map((asset, index) => {
                const displayName = asset.file_name || `Asset ${index + 1}`;

                return (
                  <ListRowCard key={asset.id}>
                    {/* Left: Asset name */}
                    <div className="flex items-center gap-3 pl-3 min-w-0 max-w-[calc(100%-10rem)]">
                      <Text className="font-bold truncate" title={asset.file_name}>
                        {displayName}
                      </Text>
                    </div>

                    {/* Right: Download, Trash, and File Type Badge */}
                    <div className="flex items-center gap-3 shrink-0 pr-1">
                      <ActionIconButton
                        icon="solar:download-linear"
                        variant="primary"
                        onClick={() => handleDownloadAsset(asset)}
                        ariaLabel={`Download ${displayName}`}
                        title="Download asset"
                      />

                      <ActionIconButton
                        icon="solar:trash-bin-trash-linear"
                        variant="danger"
                        onClick={() => setAssetToDelete(asset)}
                        ariaLabel={`Delete ${displayName}`}
                        title="Delete asset"
                      />

                      <FileTypeBadge
                        fileName={asset.file_name}
                        mediaType={asset.media_type}
                      />
                    </div>
                  </ListRowCard>
                );
              })
            )}
          </div>

          {/* Plus button to upload assets */}
          <div className="flex justify-center">
            <ActionAddButton
              onClick={() => setIsAddAssetOpen(true)}
              ariaLabel="Upload assets"
              title="Upload assets"
            />
          </div>
        </div>

        {/* ================= Sessions Section ================= */}
        <div className="flex flex-col items-center w-full gap-8">
          <Text className="text-3xl font-bold text-fg-light">Sessions</Text>

          <div className="w-full flex flex-col gap-4">
            {sessions.length === 0 ? (
              <Wrapper className="rounded-full py-6 text-center text-foreground/60">
                No sessions yet
              </Wrapper>
            ) : (
              sessions.map((session, index) => {
                const sessionCount =
                  session.document_asset_ids?.length ||
                  (index === 0 ? 2 : 1);

                return (
                  <ListRowCard key={session.id}>
                    {/* Left: Session name & external link arrow */}
                    <div className="flex items-center gap-3 pl-3 min-w-0">
                      <Text className="font-bold">
                        Session {index + 1}
                      </Text>
                      <Link
                        href={`/sessions/${session.id}`}
                        className="text-foreground/70 hover:text-primary transition-colors flex items-center p-1 shrink-0"
                        aria-label={`Open Session ${index + 1}`}
                      >
                        <Icon
                          icon="solar:arrow-right-up-linear"
                          className="text-2xl font-bold"
                        />
                      </Link>
                    </div>

                    {/* Right: Trash icon and Assets count badge */}
                    <div className="flex items-center gap-3 shrink-0 pr-1">
                      <ActionIconButton
                        icon="solar:trash-bin-trash-linear"
                        variant="danger"
                        onClick={() => setSessionToCancel(session)}
                        ariaLabel={`Cancel Session ${index + 1}`}
                        title="Cancel session"
                      />

                      <PillBadge
                        icon="solar:document-text-linear"
                        iconClassName="text-2xl"
                        variant="glass-dark"
                        className="text-sm font-medium"
                      >
                        {sessionCount} Assets
                      </PillBadge>
                    </div>
                  </ListRowCard>
                );
              })
            )}
          </div>

          {/* Plus button to start new session */}
          <div className="flex justify-center">
            <ActionAddButton
              onClick={() =>
                router.push(`/projects/${projectId}/session/prepare`)
              }
              ariaLabel="Start new session"
              title="Start new session"
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      <UploadAssetModal
        projectId={projectId}
        isOpen={isAddAssetOpen}
        onClose={() => setIsAddAssetOpen(false)}
        onAssetUploaded={handleAssetUpdated}
      />

      <DeleteAssetModal
        asset={assetToDelete}
        isOpen={!!assetToDelete}
        onClose={() => setAssetToDelete(null)}
        onAssetDeleted={() => {
          handleAssetUpdated();
          setAssetToDelete(null);
        }}
      />

      <CancelSessionModal
        session={sessionToCancel}
        sessionIndex={sessionCancelIndex}
        isOpen={!!sessionToCancel}
        onClose={() => setSessionToCancel(null)}
        onSessionCancelled={() => {
          handleSessionUpdated();
          setSessionToCancel(null);
        }}
      />
    </div>
  );
}

function ProjectDetailsWrapper({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = React.use(params);
  return <ProjectDetailsContent projectId={projectId} />;
}

export default function ProjectDetailsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  return (
    <React.Suspense fallback={<LoadingPage />}>
      <ProjectDetailsWrapper params={params} />
    </React.Suspense>
  );
}
