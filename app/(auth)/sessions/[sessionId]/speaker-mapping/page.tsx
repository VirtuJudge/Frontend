"use client";

import { use } from "react";
import { SpeakerMappingView } from "@/features/session";

export default function SessionSpeakerMappingPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);

  return <SpeakerMappingView sessionId={sessionId} />;
}
