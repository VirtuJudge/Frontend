import React from "react";
import { BaseNavBar } from "@/components/Nav-Bar/base-nav-bar";

export default function TeamsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <BaseNavBar />
      {children}
    </div>
  );
}
