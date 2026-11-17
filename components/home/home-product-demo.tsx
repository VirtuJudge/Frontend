"use client";

import { useEffect, useRef } from "react";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import ScrollReveal from "../scroll-reveal";

export const PRODUCT_DEMO_ID = "product-demo";

const VIDEO_BASE = "/videos/virtujudge-promo";

/**
 * Silent product demo for the home page.
 *
 * Plays muted while it is on screen and pauses when it scrolls away. It never
 * autoplays for visitors who prefer reduced motion, and it stays paused after
 * a visitor pauses it themselves.
 */
export default function HomeProductDemo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // The home page scrolls through ScrollSmoother, and its hero animations
    // shift the layout after load, so a native hash jump (the About page's
    // "Watch the product demo" link) can land in the wrong place. Re-apply the
    // jump while the page settles, and stop as soon as the visitor scrolls.
    if (window.location.hash !== `#${PRODUCT_DEMO_ID}`) return;

    const offset = 160;
    const timers: number[] = [];
    let cancelled = false;

    const jump = () => {
      if (cancelled) return;
      const section = document.getElementById(PRODUCT_DEMO_ID);
      if (!section) return;
      if (Math.abs(section.getBoundingClientRect().top - offset) < 40) return;
      const smoother = ScrollSmoother.get();
      if (smoother) {
        smoother.scrollTo(section, false, `top ${offset}px`);
      } else {
        section.scrollIntoView({ block: "start" });
      }
    };
    const stop = () => {
      cancelled = true;
    };

    const frame = window.requestAnimationFrame(jump);
    timers.push(window.setTimeout(jump, 400), window.setTimeout(jump, 1200));
    const inputEvents = ["wheel", "touchstart", "keydown"] as const;
    inputEvents.forEach((name) =>
      window.addEventListener(name, stop, { once: true, passive: true }),
    );

    return () => {
      window.cancelAnimationFrame(frame);
      timers.forEach((id) => window.clearTimeout(id));
      inputEvents.forEach((name) => window.removeEventListener(name, stop));
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (
      !video ||
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
    ) {
      return;
    }

    let pausedByVisitor = false;
    let pausingForScroll = false;

    const handlePause = () => {
      if (pausingForScroll) {
        pausingForScroll = false;
        return;
      }
      pausedByVisitor = true;
    };
    const handlePlay = () => {
      pausedByVisitor = false;
    };

    video.addEventListener("pause", handlePause);
    video.addEventListener("play", handlePlay);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!pausedByVisitor && video.paused) {
            video.play().catch(() => {
              // Autoplay can be blocked by the browser; the controls still work.
            });
          }
        } else if (!video.paused) {
          pausingForScroll = true;
          video.pause();
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(video);

    return () => {
      observer.disconnect();
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("play", handlePlay);
    };
  }, []);

  return (
    <ScrollReveal className="w-full">
      <section
        id={PRODUCT_DEMO_ID}
        aria-labelledby="product-demo-title"
        className="relative isolate mx-auto flex w-full max-w-6xl scroll-mt-[160px] flex-col items-center gap-8"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-72 w-3/4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[110px]"
        />
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">
            Product demo
          </p>
          <h2
            id="product-demo-title"
            className="text-3xl font-bold leading-tight text-fg sm:text-4xl"
          >
            One practice round, start to finish
          </h2>
        </div>

        <div className="w-full overflow-hidden rounded-3xl border border-primary/20 bg-bg-light shadow-[0_30px_80px_rgba(0,0,0,0.45),0_0_60px_rgba(0,229,204,0.06)]">
          <video
            ref={videoRef}
            className="block aspect-video h-auto w-full"
            width={1920}
            height={1080}
            poster={`${VIDEO_BASE}-poster.webp`}
            aria-describedby="product-demo-description"
            controls
            muted
            loop
            playsInline
            preload="metadata"
          >
            <source src={`${VIDEO_BASE}.webm`} type="video/webm" />
            <source src={`${VIDEO_BASE}.mp4`} type="video/mp4" />
            Your browser cannot play this video.{" "}
            <a href={`${VIDEO_BASE}.mp4`} className="text-primary underline">
              Download the product demo
            </a>
            .
          </video>
        </div>

        <p
          id="product-demo-description"
          className="max-w-3xl text-center text-sm leading-relaxed text-fg/60 sm:text-base"
        >
          A 27-second silent walkthrough: record your presentation and attach
          the deck, answer three judge-style questions grounded in your pitch,
          then review a sample report with team and presenter feedback.
        </p>
      </section>
    </ScrollReveal>
  );
}
