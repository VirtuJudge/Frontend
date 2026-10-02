"use client";

import React, { Suspense, use } from "react";
import { TeamDashboard } from "@/features/teams";
import LoadingPage from "@/app/loading";

function TeamDetailsWrapper({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = use(params);
  return <TeamDashboard teamId={teamId} />;
}

export default function TeamDetailsPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  return (
    <Suspense fallback={<LoadingPage />}>
      <TeamDetailsWrapper params={params} />
    </Suspense>
  );
}
