"use client";

import React from "react";
import Link from "next/link";
import { useOptionalAuth } from "@/features/auth";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = useOptionalAuth();
  const user = auth?.user ?? null;
  const signOut = auth?.signOut ?? (async () => {});

  return (
    <div className="flex min-h-[calc(100vh-140px)] w-full gap-6">
      <aside className="w-64 border border-foreground/10 flex flex-col shrink-0 bg-foreground/5 backdrop-blur-md rounded-2xl p-4 self-start sticky top-24">
        <div className="flex h-12 items-center px-2 border-b border-foreground/10 pb-3">
          <Link
            href="/dashboard"
            className="text-lg font-bold tracking-tight text-foreground"
          >
            VirtuJudge
          </Link>
        </div>

        <div className="py-3 px-2 border-b border-foreground/10">
          <div className="text-xs font-semibold uppercase tracking-wider text-foreground/50 mb-1">
            Workspace
          </div>
          <div className="text-sm font-medium text-foreground truncate">
            Pitch Rehearsal Team
          </div>
        </div>

        <nav
          aria-label="Application Navigation"
          className="flex-1 space-y-1 py-4"
        >
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium hover:bg-foreground/10 text-foreground transition-colors"
          >
            <span>Dashboard</span>
          </Link>
          <Link
            href="/dashboard#teams"
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-foreground/70 hover:bg-foreground/10 hover:text-foreground transition-colors"
          >
            <span>Teams</span>
          </Link>
          <Link
            href="/dashboard#projects"
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-foreground/70 hover:bg-foreground/10 hover:text-foreground transition-colors"
          >
            <span>Projects</span>
          </Link>
        </nav>

        <div className="pt-3 border-t border-foreground/10 px-2">
          <div className="flex items-center justify-between">
            <div className="text-sm overflow-hidden pr-2">
              <p className="font-medium text-foreground truncate">
                {user?.display_name}
              </p>
              <p className="text-xs text-foreground/60 truncate">
                {user?.email}
              </p>
            </div>
            <button
              type="button"
              onClick={() => signOut()}
              className="text-xs text-foreground/60 hover:text-foreground hover:underline shrink-0 cursor-pointer"
              aria-label="Sign out"
            >
              Exit
            </button>
          </div>
        </div>
      </aside>

      {/* Main workspace container */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
