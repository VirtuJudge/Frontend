import type { Metadata } from 'next';
import './globals.css';
import { QueryClientBoundary } from '@/lib/query-client';

export const metadata: Metadata = {
  title: 'VirtuJudge',
  description: 'AI-assisted pitch analysis, rehearsal, and evaluation.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <QueryClientBoundary>{children}</QueryClientBoundary>
      </body>
    </html>
  );
}
