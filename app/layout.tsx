import type { Metadata } from "next";
import { Inconsolata } from "next/font/google";
import "./globals.css";
import { QueryClientBoundary } from "@/lib/query-client";
import { AuthProvider } from "@/features/auth";
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
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`h-full antialiased ${inconsolata.variable}`}
    >
      <body className="flex flex-col max-w-360 mx-auto px-4 pt-30">
        <QueryClientBoundary>
          <AuthProvider>
            <NavBar />
            {children}
          </AuthProvider>
        </QueryClientBoundary>
      </body>
    </html>
  );
}
