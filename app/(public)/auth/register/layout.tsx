import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account",
  description:
    "Sign up for VirtuJudge to start rehearsing your presentations and receiving actionable AI pitch feedback.",
  alternates: {
    canonical: "/auth/register",
  },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
