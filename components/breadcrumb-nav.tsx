"use client";

import { Icon } from "@iconify/react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

export interface BreadcrumbNavProps {
  backHref: string;
  parentLabel: string;
  currentLabel: string;
  className?: string;
}

export function BreadcrumbNav({
  backHref,
  parentLabel,
  currentLabel,
  className,
}: BreadcrumbNavProps) {
  return (
    <div className={cn("flex items-center justify-center flex-wrap gap-3 mb-6", className)}>
      <Button
        href={backHref}
        variant="glass-dark"
        borderGradient="default"
        className="px-6 py-2 rounded-full cursor-pointer hover:border-primary transition-colors"
      >
        {parentLabel}
      </Button>

      <Icon
        icon="tabler:arrow-right-circle-filled"
        className="text-3xl"
      />

      <Button
        variant="glass-dark"
        borderGradient="default"
        className="px-6 py-2 rounded-full cursor-auto active:scale-100"
      >
        {currentLabel}
      </Button>
    </div>
  );
}
