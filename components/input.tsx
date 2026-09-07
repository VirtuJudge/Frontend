"use client";

import React from "react";
import {
  Wrapper,
  type WrapperVariant,
  type BorderGradientVariant,
} from "./wrapper";

import { cn } from "@/lib/utils";

export type InputVariant = WrapperVariant;
export type InputSize = "sm" | "default" | "lg";

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: React.ReactNode;
  labelClassName?: string;
  variant?: InputVariant;
  borderGradient?: BorderGradientVariant;
  size?: InputSize;
  top?: string | number;
  wrapperClassName?: string;
  wrapperStyle?: React.CSSProperties;
}

const SIZES: Record<
  InputSize,
  { height: string; text: string; padding: string }
> = {
  sm: { height: "h-[42px]", text: "text-[16px]", padding: "px-[16px]" },
  default: { height: "h-[55px]", text: "text-[18px]", padding: "px-[24px]" },
  lg: { height: "h-[64px]", text: "text-[20px]", padding: "px-[28px]" },
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input(
    {
      label,
      labelClassName = "",
      variant = "glass",
      borderGradient,
      size = "default",
      top,
      id,
      disabled = false,
      className = "",
      style,
      wrapperStyle,
      type = "text",
      ...rest
    },
    ref,
  ) {
    const generatedId = React.useId();
    const inputId = id || (label ? generatedId : undefined);
    const sizeConfig = SIZES[size] || SIZES.default;

    const layoutStyle: React.CSSProperties = {
      ...(top !== undefined
        ? { top: typeof top === "number" ? `${top}px` : top }
        : {}),
    };

    const mergedWrapperClassName = cn(
      "flex items-center transition-all duration-200 cursor-text w-[480px]",
      sizeConfig.height,
      sizeConfig.padding,
      disabled && "opacity-50 pointer-events-none cursor-not-allowed",
      className,
    );

    const mergedWrapperStyle: React.CSSProperties = {
      ...layoutStyle,
      ...wrapperStyle,
    };

    const mergedInputClassName = cn(
      "bg-transparent border-none outline-none focus:outline-none focus-visible:outline-none text-fg placeholder:text-fg-light/50 leading-none disabled:pointer-events-none w-full",
      sizeConfig.text,
      className,
    );

    const inputWrapper = (
      <Wrapper
        variant={variant}
        borderGradient={borderGradient}
        className={mergedWrapperClassName}
        style={mergedWrapperStyle}
        data-slot="input-wrapper"
      >
        <input
          ref={ref}
          id={inputId}
          type={type}
          disabled={disabled}
          aria-disabled={disabled}
          className={mergedInputClassName}
          style={style}
          {...rest}
        />
      </Wrapper>
    );

    if (label) {
      const mergedLabelWrapperClassName = cn(
        "flex flex-col gap-[8px]",
      );

      const mergedLabelClassName = cn(
        "text-fg text-[18px] font-medium pl-[12px] select-none",
        labelClassName,
      );

      return (
        <div className={mergedLabelWrapperClassName} style={layoutStyle}>
          <label htmlFor={inputId} className={mergedLabelClassName}>
            {label}
          </label>
          {inputWrapper}
        </div>
      );
    }

    return inputWrapper;
  },
);

Input.displayName = "Input";
