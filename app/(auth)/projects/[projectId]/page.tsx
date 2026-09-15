"use client";

import { Suspense, use } from "react";
import LoadingPage from "@/app/loading";
import { ProjectDetailsContent } from "@/features/projects/project-details-content";

function ProjectDetailsWrapper({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  return <ProjectDetailsContent projectId={projectId} />;
}

export default function ProjectDetailsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  return (
    <Suspense fallback={<LoadingPage />}>
      <ProjectDetailsWrapper params={params} />
    </Suspense>
  );
}
