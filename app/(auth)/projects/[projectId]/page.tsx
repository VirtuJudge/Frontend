"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Text } from "@/components";
import { ProjectAssetList } from "@/features/upload";
import { apiClient } from "@/lib/api/client";
import LoadingPage from "@/app/loading";
import NotFoundPage from "@/app/not-found";
import { WorkspaceNavBar } from "@/components/Nav-Bar";

export function ProjectDetailsContent({ projectId }: { projectId: string }) {
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

  const { isLoading: isAssetsLoading } = useQuery({
    queryKey: ["projectAssets", projectId],
    queryFn: () => apiClient.getAssets(projectId),
    enabled: !!projectId,
  });

  if (isProjectLoading || (teamId && isTeamLoading) || isAssetsLoading) {
    return <LoadingPage />;
  }

  if (!project) {
    return <NotFoundPage />;
  }

  return (
    <div className="flex flex-col justify-center items-center mb-12 gap-8 w-full max-w-5xl mx-auto">
      <WorkspaceNavBar />
      <div className="flex flex-col justify-center gap-6">
        {project.description && (
          <Text size="sm" className="text-foreground/70">
            {project.description}
          </Text>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <ProjectAssetList projectId={projectId} />
      </div>
      <Button
        variant="primary"
        size="sm"
        href={`/projects/${projectId}/session/prepare`}
        className="font-bold max-w-md w-full"
      >
        Prepare Session
      </Button>
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
