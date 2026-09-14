import React from "react";
import DashboardNavBar from "@/components/Nav-Bar/dashboard-nav-bar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <DashboardNavBar />
      {children}
    </div>
  );
}
