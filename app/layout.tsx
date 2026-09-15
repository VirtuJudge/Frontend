import type { Metadata } from "next";
import { Inconsolata } from "next/font/google";
import "./globals.css";
import { QueryClientBoundary } from "@/lib/query-client";
import { AuthProvider } from "@/features/auth";

const inconsolata = Inconsolata({
  subsets: ["latin"],
  variable: "--font-inconsolata",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VirtuJudge",
  description: "AI-assisted pitch analysis, rehearsal, and evaluation.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`h-full antialiased dark ${inconsolata.variable}`}
    >
      <body className="">
        <QueryClientBoundary>
          <AuthProvider>
            {children}
          </AuthProvider>
        </QueryClientBoundary>
      </body>
    </html>
  );
}
