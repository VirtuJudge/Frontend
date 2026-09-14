"use client";

import React from "react";
import { Wrapper, WrapperVariant } from "./wrapper";
import { cn } from "@/lib/utils";

export interface ListRowCardProps {
  variant?: WrapperVariant;
  className?: string;
  children: React.ReactNode;
}

export function ListRowCard({
  variant = "glass",
  className,
  children,
}: ListRowCardProps) {
  return (
    <Wrapper
      variant={variant}
      className={cn(
        "rounded-4xl p-2 flex items-center justify-between flex-wrap gap-4 w-full transition-all hover:bg-foreground/5",
        className
      )}
    >
      {children}
    </Wrapper>
  );
}
