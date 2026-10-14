"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { TextPlugin } from "gsap/TextPlugin";

type TypewriterTextProps = {
  text: string;
  typeSpeed?: number;
  eraseSpeed?: number;
  pauseDuration?: number;
};

export default function TypewriterText({
  text,
  typeSpeed = 75,
  eraseSpeed = 40,
  pauseDuration = 2000,
}: TypewriterTextProps) {
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const textElement = textRef.current;
    if (!textElement) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      textElement.textContent = text;
      return;
    }

    gsap.registerPlugin(TextPlugin);
    textElement.textContent = "";

    const timeline = gsap.timeline({ repeat: -1, defaults: { ease: "none" } });
    timeline
      .to(textElement, {
        text: { value: text, delimiter: "" },
        duration: (text.length * typeSpeed) / 1000,
      })
      .to(textElement, { duration: pauseDuration / 1000 })
      .to(textElement, {
        text: { value: "", delimiter: "", rtl: true },
        duration: (text.length * eraseSpeed) / 1000,
      })
      .to(textElement, { duration: typeSpeed / 1000 });

    return () => {
      timeline.kill();
    };
  }, [eraseSpeed, pauseDuration, text, typeSpeed]);

  return (
    <>
      <span aria-hidden="true">
        <span ref={textRef} />
        <span className="motion-safe:animate-pulse">|</span>
      </span>
      <span className="sr-only">{text}</span>
    </>
  );
}
