"use client";

import React from "react";
import { Icon } from "@iconify/react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

export interface ActionAddButtonProps {
  onClick: () => void;
  ariaLabel?: string;
  title?: string;
  className?: string;
  disabled?: boolean;
}

export function ActionAddButton({
  onClick,
  ariaLabel = "Add",
  title = "Add",
  className,
  disabled,
}: ActionAddButtonProps) {
  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled}
      variant="primary"
      aria-label={ariaLabel}
      title={title}
      className={cn("px-7 py-3 rounded-full text-3xl font-bold w-fit", className)}
    >
      <Icon icon="tabler:plus" />
    </Button>
  );
}

export type ActionIconVariant = "danger" | "primary" | "default";

export interface ActionIconButtonProps {
  icon: string;
  variant?: ActionIconVariant;
  onClick?: (e: React.MouseEvent) => void;
  ariaLabel: string;
  title?: string;
  className?: string;
  disabled?: boolean;
}

export function ActionIconButton({
  icon,
  variant = "default",
  onClick,
  ariaLabel,
  title,
  className,
  disabled,
}: ActionIconButtonProps) {
  const variantStyles = {
    danger: "text-danger",
    primary: "text-primary",
    default: "text-foreground/70",
  }[variant];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={title || ariaLabel}
      className={cn(
        "transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none shrink-0",
        variantStyles,
        className
      )}
    >
      <Icon icon={icon} className="text-2xl" />
    </button>
  );
}
