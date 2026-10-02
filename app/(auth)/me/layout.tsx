import React from "react";
import MeNavBar from "@/components/nav-bar/me-nav-bar";

export default function MeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <MeNavBar />
      {children}
    </div>
  );
}
