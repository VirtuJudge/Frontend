import type { Metadata } from "next";
import { Inconsolata } from "next/font/google";
import "./globals.css";
import { QueryClientBoundary } from "@/lib/query-client";
import { AuthProvider } from "@/features/auth";
import { Analytics } from "@vercel/analytics/next";

const inconsolata = Inconsolata({
  subsets: ["latin"],
  variable: "--font-inconsolata",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VirtuJudge",
  description: "AI-assisted pitch analysis, rehearsal, and evaluation.",
  openGraph: {
    title: "VirtuJudge",
    description:
      "A platform that helps you to improve your presentation skills by providing a suite of AI-assisted tools. With our cutting-edge technology, we're able to analyze your performance, identify areas for improvement, and provide personalized feedback to help you become the best presenter you can be.",
    url: "https://virtu-judge.vercel.app/",
    siteName: "VirtuJudge",
    images: [
      {
        url: "https://virtu-judge.vercel.app/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "VirtuJudge Social Preview",
      },
    ],
    type: "website",
  },
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
          <AuthProvider>{children}</AuthProvider>
        </QueryClientBoundary>
        <Analytics />
      </body>
    </html>
  );
}
