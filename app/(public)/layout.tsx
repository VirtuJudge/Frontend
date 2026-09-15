'use client'

import React from "react";
import NavBar from "@/components/Nav-Bar/nav-bar";
import { Footer, If }  from "@/components/";
import { usePathname } from "next/navigation";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  const pathname = usePathname();

  return (
    <div className="flex flex-col">
      <NavBar />
      <main className="flex flex-col w-full max-w-7xl mx-auto pt-40 p-10 page-animation">{children}</main>
      <If condition={!pathname.startsWith("/auth")}>
        <Footer />
      </If>
    </div>
  );
}
