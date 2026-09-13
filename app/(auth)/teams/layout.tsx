import React from "react";
import NavBar from "@/components/Nav-Bar/nav-bar";

export default function TeamsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <NavBar />
      {children}
    </div>
  );
}
