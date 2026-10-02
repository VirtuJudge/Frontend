"use client";

import { use } from "react";
import { SessionPrepareContent } from "@/features/session";

export default function PrepareSessionPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);

  return <SessionPrepareContent projectId={projectId} />;
}
