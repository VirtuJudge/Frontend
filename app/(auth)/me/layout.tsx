import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account",
  description: "Manage your VirtuJudge profile and workspace settings.",
};

export default function MeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
