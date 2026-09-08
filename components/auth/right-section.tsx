"use client";

import { Wrapper } from "@/components";
import Image from "next/image";

export default function RightSection() {
  return (
    <>
      {/* Mobile layout: shown in normal flow at bottom on screens < 1080px */}
      <div className="w-full flex justify-center items-center mt-10 pb-6 overflow-hidden min-[1080px]:hidden">
        <div className="relative w-full max-w-90 flex justify-center items-center">
          <Image
            src="/logos/vector-gradient-dark.webp"
            alt="VirtuJudge Logo"
            width={800}
            height={600}
            priority
            className="w-full h-auto object-contain"
          />
        </div>
      </div>

      {/* Desktop layout: shown on right on screens >= 1080px */}
      <div className="hidden min-[1080px]:block absolute -right-20 top-1/2 -translate-y-2/3">
        <div className="relative">
          <Wrapper
            variant="glass"
            borderGradient="primary"
            className="w-160 h-100 z-50 block"
          />
          <Image
            src="/logos/vector-gradient-dark.webp"
            alt="VirtuJudge Logo"
            width={1200}
            height={500}
            className="absolute left-1/2 -translate-x-1/2 -translate-y-1/4 -z-50 overflow-hidden"
          />
        </div>
      </div>
    </>
  );
}
