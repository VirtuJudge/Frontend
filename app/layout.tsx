import type { Metadata } from "next";
import { Inconsolata } from "next/font/google";
import "./globals.css";
import { QueryClientBoundary } from "@/lib/query-client";
import NavBar from "@/components/Nav-Bar/nav-bar";

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
    <html lang="en" className={`h-full antialiased ${inconsolata.variable}`}>
      <body className="flex flex-col max-w-360 mx-auto px-8 py-30">
        <NavBar />
        <QueryClientBoundary>{children}</QueryClientBoundary>
      </body>
    </html>
  );
}
