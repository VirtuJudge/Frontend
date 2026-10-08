import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { QueryClientBoundary } from "@/lib/query-client";
import { AuthProvider } from "@/features/auth";
import { Analytics } from "@vercel/analytics/next";

const inconsolata = localFont({
  src: "./fonts/Inconsolata.woff2",
  variable: "--font-inconsolata",
  display: "swap",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://virtujudge.dev";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "VirtuJudge",
    template: "%s | VirtuJudge",
  },
  description:
    "VirtuJudge is an AI-powered pitch evaluation platform that analyzes your speech, slides, and presentation delivery to provide actionable rehearsal feedback.",
  keywords: [
    "VirtuJudge",
    "AI pitch coach",
    "presentation analysis",
    "pitch rehearsal",
    "speech evaluation",
    "public speaking AI",
    "presentation feedback",
  ],
  authors: [{ name: "VirtuJudge Team" }],
  creator: "VirtuJudge",
  publisher: "VirtuJudge",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "VirtuJudge",
    title: "VirtuJudge | AI-Assisted Pitch Analysis & Presentation Rehearsal",
    description:
      "A platform that helps you to improve your presentation skills by providing a suite of AI-assisted tools. Analyze your performance, identify areas for improvement, and get personalized feedback.",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "VirtuJudge Social Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "VirtuJudge | AI-Assisted Pitch Analysis & Presentation Rehearsal",
    description:
      "Master your pitch with instant AI feedback on speech cadence, delivery, and presentation effectiveness.",
    images: ["/opengraph-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "VirtuJudge",
      description:
        "AI-assisted pitch analysis, rehearsal, and evaluation platform.",
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${siteUrl}/#application`,
      name: "VirtuJudge",
      applicationCategory: "BusinessApplication",
      operatingSystem: "All",
      offers: {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
      },
      description:
        "AI-assisted pitch analysis and presentation rehearsal platform.",
    },
  ],
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
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="">
        <QueryClientBoundary>
          <AuthProvider>{children}</AuthProvider>
        </QueryClientBoundary>
        <Analytics />
      </body>
    </html>
  );
}
