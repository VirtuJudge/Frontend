"use client";

import { use } from "react";
import { SessionRecordContent } from "@/features/session/session-record-content";

export default function SessionRecordPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  return <SessionRecordContent projectId={projectId} />;
}
