import React from "react";
import { cn } from "@/lib/utils";

export type TextSize =
  // deprecated
  "xs" | "sm" | "md" | "lg" |
  // new sizes
  "hero" | "headline" | "subheadline" | "body" | "body-large" | "caption" | "inherit";


export interface TextProps<E extends React.ElementType = "p"> {
  as?: E;
  size?: TextSize;
  className?: string;
  children?: React.ReactNode;
}

const TEXT_SIZES: Record<TextSize, string> = {
  // deprecated
  xs: "text-[16px]",
  sm: "text-[20px]",
  md: "text-[24px]",
  lg: "text-[40px] font-bold",
  // new sizes
  hero: "text-hero",
  headline: "text-headline",
  subheadline: "text-subheadline",
  body: "text-body",
  "body-large": "text-body-large",
  caption: "text-caption",
  inherit: "text-inherit"
};

export const Text = React.forwardRef(function Text(
  {
    as,
    size = "md",
    className = "",
    children,
    ...rest
  }: TextProps<React.ElementType> & React.HTMLAttributes<HTMLElement>,
  ref: React.ForwardedRef<Element>,
) {
  const Component = as || "p";
  const sizeClass = TEXT_SIZES[size] || TEXT_SIZES.md;

  return (
    <Component
      ref={ref}
      className={cn("text-fg text-center", sizeClass, className)}
      {...rest}
    >
      {children}
    </Component>
  );
}) as <E extends React.ElementType = "p">(
  props: TextProps<E> &
    Omit<React.ComponentPropsWithoutRef<E>, keyof TextProps<E>> & {
      ref?: React.ComponentPropsWithRef<E>["ref"];
    },
) => React.ReactElement | null;
