import React from "react";
import Link from "next/link";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Sidebar navigation */}
      <aside className="w-64 border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 flex flex-col shrink-0">
        <div className="flex h-16 items-center px-6 border-b border-zinc-200 dark:border-zinc-800">
          <Link
            href="/dashboard"
            className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100"
          >
            VirtuJudge
          </Link>
        </div>

        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1">
            Workspace
          </div>
          <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
            Pitch Rehearsal Team
          </div>
        </div>

        <nav
          aria-label="Application Navigation"
          className="flex-1 space-y-1 p-4"
        >
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <span>Dashboard</span>
          </Link>
          <Link
            href="/dashboard#teams"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100 transition-colors"
          >
            <span>Teams</span>
          </Link>
          <Link
            href="/dashboard#projects"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100 transition-colors"
          >
            <span>Projects</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <p className="font-medium text-zinc-800 dark:text-zinc-200">
                Alex Morgan
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                alex@example.com
              </p>
            </div>
            <Link
              href="/"
              className="text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              aria-label="Sign out"
            >
              Exit
            </Link>
          </div>
        </div>
      </aside>

      {/* Main workspace container */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
