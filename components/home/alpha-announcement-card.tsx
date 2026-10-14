import Image from "next/image";
import { Wrapper } from "../wrapper";
import TypewriterText from "./typewriter-text";

export default function AlphaAnnouncementCard() {
  return (
    <Wrapper
      as="article"
      data-speed="1.08"
      data-lag="0.06"
      className="relative isolate col-span-2 flex flex-col justify-between gap-4 overflow-hidden px-6 py-6 sm:px-9 sm:py-8 lg:col-start-2 lg:row-start-1 lg:row-span-2"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full border border-primary/10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-7 -top-14 size-52 rounded-full border border-primary/8"
      />
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.07] px-3 py-1.5 text-md italic font-bold text-fg/85">
          <TypewriterText text="Alpha version is available" />
        </span>
        <span className="font-mono text-xs text-fg/45">v0.0.1a</span>
      </div>
      <div className="relative z-10 flex flex-wrap items-center gap-5 sm:gap-7">
        <Image
          src="/logos/logo-primary.webp"
          alt="VirtuJudge logo"
          width={671}
          height={304}
          priority
          className="h-auto w-24 sm:w-32"
        />
        <div className="min-w-0 flex-1 basis-48">
          <h2 className="mt-2 text-2xl font-semibold leading-tight text-fg sm:text-3xl">
            Make every presentation count.
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-fg/65 sm:text-base">
            Rehearse, review your delivery, and walk into the room with a
            clearer plan.
          </p>
        </div>
      </div>
    </Wrapper>
  );
}
