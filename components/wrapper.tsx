"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type WrapperVariant = "glass" | "primary" | "dark" | "danger";
export type BorderGradientVariant = "default" | "nav" | "none" | (string & {});

export const BORDER_GRADIENTS: Record<string, string> = {
  default: "var(--background-image-gradient-border)",
  nav: "var(--background-image-gradient-nav-border)",
};

export const BG_VARIANTS: Record<
  WrapperVariant,
  {
    className: string;
    bgColorVar?: string;
    borderGradient: BorderGradientVariant;
  }
> = {
  glass: {
    className: "bg-glass backdrop-blur-[20px] text-fg",
    bgColorVar: "--color-glass",
    borderGradient: "default",
  },
  primary: {
    className: "bg-primary text-bg",
    bgColorVar: "--color-primary",
    borderGradient: "none",
  },
  dark: {
    className: "bg-bg-light text-glass",
    bgColorVar: "--color-bg-light",
    borderGradient: "default",
  },
  danger: {
    className: "bg-danger text-white",
    bgColorVar: "--color-danger",
    borderGradient: "none",
  },
};

export const getBorderGradientClass = (
  gradient: BorderGradientVariant = "default",
): string => {
  if (gradient === "none") return "border border-transparent";
  if (gradient === "nav") return "border-gradient-nav";
  return "border-gradient";
};

export interface WrapperStyleOptions {
  variant?: WrapperVariant;
  borderGradient?: BorderGradientVariant;
  bgColorVar?: string;
  gradientVar?: string;
  borderWidth?: string | number;
}

export const getWrapperBorderStyle = ({
  variant = "glass",
  borderGradient,
  bgColorVar,
  gradientVar,
  borderWidth = "1px",
}: WrapperStyleOptions = {}): React.CSSProperties => {
  const config = BG_VARIANTS[variant] || BG_VARIANTS.glass;
  const bg = bgColorVar || config.bgColorVar;
  const selectedGradient =
    borderGradient || gradientVar || config.borderGradient;
  const width =
    typeof borderWidth === "number" ? `${borderWidth}px` : borderWidth;

  const style: React.CSSProperties = {
    backgroundColor: `var(${bg})`,
  };

  if (variant === "glass" || variant === "primary") {
    style.backdropFilter = "blur(20px)";
    style.WebkitBackdropFilter = "blur(20px)";
  }

  if (selectedGradient && selectedGradient !== "none") {
    const gradient =
      BORDER_GRADIENTS[selectedGradient] ||
      (selectedGradient.startsWith("var(") ||
      selectedGradient.startsWith("linear-gradient(")
        ? selectedGradient
        : `var(${selectedGradient})`);

    const customStyle = style as Record<string, unknown>;
    customStyle["--border-gradient-source"] = gradient;
    if (width !== "1px") {
      customStyle["--border-gradient-width"] = width;
    }
  } else {
    style.border = `${width} solid transparent`;
  }

  return style;
};

export const getGlassGradientBorderStyle = getWrapperBorderStyle;

export interface WrapperProps<E extends React.ElementType = "div"> {
  as?: E;
  variant?: WrapperVariant;
  borderGradient?: BorderGradientVariant;
  bgColorVar?: string;
  gradientVar?: string;
  borderWidth?: string | number;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export const Wrapper = React.forwardRef(function Wrapper(
  {
    as,
    variant = "glass",
    borderGradient,
    bgColorVar,
    gradientVar,
    borderWidth = "1px",
    className = "",
    style,
    children,
    onClick,
    ...rest
  }: WrapperProps<React.ElementType> & React.HTMLAttributes<HTMLElement>,
  ref: React.ForwardedRef<Element>,
) {
  const Component = as || "div";

  const config = BG_VARIANTS[variant] || BG_VARIANTS.glass;
  const selectedBorderGradient =
    borderGradient || gradientVar || config.borderGradient;
  const borderGradientClass = getBorderGradientClass(selectedBorderGradient);

  const wrapperStyle = getWrapperBorderStyle({
    variant,
    borderGradient: selectedBorderGradient,
    bgColorVar,
    gradientVar,
    borderWidth,
  });

  const mergedClassName = cn(
    config.className,
    borderGradientClass,
    "rounded-2xl py-[15px] px-[20px] outline-none focus:outline-none focus-visible:outline-none",
    className,
  );

  const mergedStyle: React.CSSProperties = {
    ...wrapperStyle,
    ...style,
  };

  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    if (Component === "div" || Component === "span") {
      const target = e.target as HTMLElement;
      if (
        !target.closest(
          "input, textarea, select, button, a, [role='button'], label",
        )
      ) {
        const inputs = (e.currentTarget as HTMLElement).querySelectorAll<
          HTMLInputElement | HTMLTextAreaElement
        >("input, textarea");
        if (inputs.length === 1) {
          inputs[0].focus();
        }
      }
    }
    onClick?.(e);
  };

  return (
    <Component
      ref={ref}
      className={mergedClassName}
      style={mergedStyle}
      onClick={handleClick}
      {...rest}
    >
      {children}
    </Component>
  );
}) as <E extends React.ElementType = "div">(
  props: WrapperProps<E> &
    Omit<React.ComponentPropsWithoutRef<E>, keyof WrapperProps<E>> & {
      ref?: React.ComponentPropsWithRef<E>["ref"];
    },
) => React.ReactElement | null;
