"use client";

import React from "react";
import Link from "next/link";

import {
  Wrapper,
  type WrapperVariant,
  type BorderGradientVariant,
} from "./wrapper";
import { cn } from "@/lib/utils";

export type ButtonVariant = WrapperVariant;
export type ButtonSize = "sm" | "default" | "lg";

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  variant?: ButtonVariant;
  borderGradient?: BorderGradientVariant;
  size?: ButtonSize;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
  href?: string;
  target?: string;
  rel?: string;
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
}

const SIZES: Record<ButtonSize, string> = {
  sm: "h-[42px] py-[10px] px-[15px] text-[18px]",
  default: "h-[57px] py-[15px] px-[20px] text-[24px]",
  lg: "h-[64px] py-[18px] px-[25px] text-[26px]",
};

const BASE_CLASSES =
  "relative inline-flex items-center justify-center font-bold leading-none gap-[10px] rounded-[50px] select-none transition-all duration-200 cursor-pointer hover:brightness-110 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed aria-disabled:pointer-events-none aria-disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg whitespace-nowrap shrink-0";

export const Button = React.forwardRef<HTMLElement, ButtonProps>(function Button(
  {
    variant = "glass",
    borderGradient,
    size = "default",
    leftIcon,
    rightIcon,
    loading = false,
    disabled = false,
    href,
    className = "",
    style,
    children,
    type = "button",
    onClick,
    ...rest
  },
  ref,
) {
  const sizeClasses = SIZES[size] || SIZES.default;
  const mergedClassName = cn(BASE_CLASSES, sizeClasses, className);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (disabled || loading) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  const content = (
    <>
      {loading && (
        <span
          className="inline-block h-4 animate-spin border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      )}
      {!loading && leftIcon && <span className="shrink-0">{leftIcon}</span>}
      {children}
      {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </>
  );

  if (href) {
    return (
      <Wrapper
        as={Link}
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        variant={variant}
        borderGradient={borderGradient}
        className={mergedClassName}
        style={style}
        aria-disabled={disabled || loading}
        onClick={handleClick}
        {...(rest as unknown as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {content}
      </Wrapper>
    );
  }

  return (
    <Wrapper
      as="button"
      ref={ref as React.Ref<HTMLButtonElement>}
      type={type}
      variant={variant}
      borderGradient={borderGradient}
      className={mergedClassName}
      style={style}
      disabled={disabled || loading}
      aria-busy={loading}
      onClick={handleClick}
      {...rest}
    >
      {content}
    </Wrapper>
  );
});
