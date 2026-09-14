"use client";

import { use } from "react";

export default function GlobalSessionQAPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg text-fg">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-foreground/70 text-sm">Opening session {id}...</p>
      </div>
    </div>
  );
}
