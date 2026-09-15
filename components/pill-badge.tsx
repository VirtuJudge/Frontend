"use client";

import React from "react";
import { Icon } from "@iconify/react";
import { Wrapper, WrapperVariant } from "./wrapper";
import { Button } from "./button";
import { cn } from "@/lib/utils";

export interface PillBadgeProps {
  icon?: string;
  iconClassName?: string;
  variant?: WrapperVariant;
  className?: string;
  children: React.ReactNode;
}

export function PillBadge({
  icon,
  iconClassName = "text-2xl",
  variant,
  className,
  children,
}: PillBadgeProps) {
  return (
    <Wrapper
      variant={variant}
      className={cn("flex items-center gap-2 px-4 py-3 rounded-full shrink-0", className)}
    >
      {icon && <Icon icon={icon} className={iconClassName} />}
      <span>{children}</span>
    </Wrapper>
  );
}

export interface RoleBadgeProps {
  role?: string;
  className?: string;
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  if (!role) return null;
  const formattedRole = role.charAt(0).toUpperCase() + role.slice(1);

  return (
    <Wrapper
      variant="glass-dark"
      className={cn(
        "flex items-center gap-2 px-4 py-3 rounded-full text-fg/90 shrink-0",
        className
      )}
    >
      {formattedRole}
    </Wrapper>
  );
}

export interface SectionHeaderBadgeProps {
  children: React.ReactNode;
  className?: string;
}

export function SectionHeaderBadge({
  children,
  className,
}: SectionHeaderBadgeProps) {
  return (
    <Button
      variant="glass-dark"
      borderGradient="default"
      className={cn("cursor-auto active:scale-100 mb-4", className)}
    >
      {children}
    </Button>
  );
}
