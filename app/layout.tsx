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
    description: `With over ${new Date().getFullYear() - 1999} years of impactful experience, the IEEE Zagazig University Student Branch (ZSB) stands as one of the first and most influential branches in Egypt. While based at Zagazig University, our influence extends nationwide through a variety of workshops, events, and initiatives that explore the evolving role of technology in all aspects of life.`,
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
