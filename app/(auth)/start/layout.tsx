import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Start Workspace",
  description:
    "Get started with your VirtuJudge workspace. Manage teams and presentation rehearsal projects.",
};

export default function StartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
