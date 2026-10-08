import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Explore transparent pricing plans for VirtuJudge. Choose from Personal, Professional, or Enterprise tiers.",
  alternates: {
    canonical: "/pricing",
  },
  openGraph: {
    title: "Pricing | VirtuJudge",
    description:
      "Explore transparent pricing plans for VirtuJudge. Choose from Personal, Professional, or Enterprise tiers for AI-assisted pitch coaching and rehearsal.",
    url: "https://www.virtujudge.dev/pricing",
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
