"use client";

import Image from "next/image";
import { Button } from "@/components";

export interface SessionHeaderProps {
  onNavigate?: () => void;
}

export function SessionHeader({ onNavigate }: SessionHeaderProps) {
  return (
    <Button
      variant="glass-dark"
      borderGradient="default"
      href="/home"
      onClick={onNavigate}
      className="fixed top-6 left-1/2 -translate-x-1/2 z-40 px-6 py-1 rounded-full shadow-xl flex items-center justify-center gap-2 cursor-pointer"
    >
      <Image
        src="/logos/logo-light.webp"
        alt="VirtuJudge"
        width={60}
        height={26}
        priority
      />
    </Button>
  );
}
