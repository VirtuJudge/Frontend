"use client";

import React, { useEffect, useContext } from "react";
import { QueryClientContext } from "@tanstack/react-query";
import { useOptionalAuth } from "@/features/auth";
import { ensureDefaultTeamAndProject } from "@/features/auth/ensure-default-workspace";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = useOptionalAuth();
  const queryClient = useContext(QueryClientContext);
  const user = auth?.user;

  useEffect(() => {
    if (!user) return;

    ensureDefaultTeamAndProject(user, queryClient).catch((error) => {
      console.warn(
        "Failed to ensure default workspace in authenticated layout:",
        error,
      );
    });
  }, [user, queryClient]);

  return (
    <div className="flex flex-col min-h-[calc(100vh-140px)] px-4">
      {children}
    </div>
  );
}

