"use client";

import React from "react";

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col py-12 pt-20">
      {children}
    </div>
  );
}
