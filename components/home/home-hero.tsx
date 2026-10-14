"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";

export default function HomeHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const descriptionRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    gsap.registerPlugin(SplitText);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const splits: SplitText[] = [];
    const context = gsap.context(() => {
      [headingRef.current, descriptionRef.current].forEach((element) => {
        if (!element) return;

        const isHeading = element === headingRef.current;

        splits.push(
          SplitText.create(element, {
            type: "lines, words, chars",
            autoSplit: true,
            onSplit: (split) =>
              isHeading
                ? gsap.from(split.chars, {
                    y: 100,
                    autoAlpha: 0,
                    duration: 0.8,
                    ease: "power4.out",
                    stagger: 0.035,
                  })
                : gsap.from(split.lines, {
                    y: 30,
                    autoAlpha: 0,
                    duration: 0.6,
                    ease: "power3.out",
                    stagger: 0.1,
                    delay: 0.35,
                  }),
          }),
        );
      });
    }, sectionRef);

    return () => {
      splits.forEach((split) => {
        split.kill();
        split.revert();
      });
      context.revert();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      data-lag="0.12"
      className="mt-10 space-y-1 flex flex-col items-center justify-center"
    >
      <h1 ref={headingRef} className="text-fg text-center text-hero">
        <b>Be the next one on stage!</b>
      </h1>
      <p
        ref={descriptionRef}
        className="text-fg text-center max-w-3xl"
      >
        VirtuJudge is a platform that helps you to improve your presentation
        skills by providing a suite of AI-assisted tools. With our
        cutting-edge technology, we&#8217;re able to analyze your performance,
        identify areas for improvement, and provide personalized feedback to
        help you become the best presenter you can be.
      </p>
    </section>
  );
}
