import React from "react";
import Link from "next/link";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100"
            >
              VirtuJudge
            </Link>
            <nav
              aria-label="Public Navigation"
              className="hidden md:flex items-center gap-4 text-sm font-medium text-zinc-600 dark:text-zinc-400"
            >
              <Link
                href="/#features"
                className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              >
                Features
              </Link>
              <Link
                href="/dashboard"
                className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              >
                Workspace
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
            >
              Enter Workspace
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer
        role="contentinfo"
        className="border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          <p>
            © {new Date().getFullYear()} VirtuJudge. AI-assisted pitch analysis
            and rehearsal.
          </p>
        </div>
      </footer>
    </div>
  );
}
