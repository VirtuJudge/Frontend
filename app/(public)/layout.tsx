'use client'

import React, { useEffect, useLayoutEffect, useRef } from "react";
import NavBar from "@/components/nav-bar/nav-bar";
import { Footer, If }  from "@/components/";
import { usePathname } from "next/navigation";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSmoother } from "gsap/ScrollSmoother";

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  const pathname = usePathname();
  const smoothWrapperRef = useRef<HTMLDivElement>(null);
  const smoothContentRef = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    if (
      pathname !== "/" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !smoothWrapperRef.current ||
      !smoothContentRef.current
    ) {
      return;
    }

    gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

    const smoother = ScrollSmoother.create({
      wrapper: smoothWrapperRef.current,
      content: smoothContentRef.current,
      smooth: 1,
      effects: true,
    });

    ScrollTrigger.refresh();

    return () => smoother.kill();
  }, [pathname]);

  const pageContent = (
    <>
      <main className="flex flex-col w-full max-w-7xl mx-auto pt-40 p-5 page-animation">
        {children}
      </main>
      <If condition={!pathname.startsWith("/auth")}>
        <Footer />
      </If>
    </>
  );

  return (
    <div className="flex flex-col">
      <NavBar />
      {pathname === "/" ? (
        <div id="smooth-wrapper" ref={smoothWrapperRef}>
          <div id="smooth-content" ref={smoothContentRef}>
            {pageContent}
          </div>
        </div>
      ) : (
        pageContent
      )}
    </div>
  );
}
