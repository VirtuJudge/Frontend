import type { Metadata } from "next";
import MeNavBar from "@/components/nav-bar/me-nav-bar";

export const metadata: Metadata = {
  title: "Account",
  description: "Manage your VirtuJudge profile and workspace settings.",
};

export default function MeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen pt-24">
      <MeNavBar />
      {children}
    </div>
  );
}
