import React from "react";
import { BaseNavBar } from "@/components/nav-bar/base-nav-bar";

export default function TeamsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen pt-24">
      <BaseNavBar />
      {children}
    </div>
  );
}
