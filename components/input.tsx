"use client";

import React from "react";
import {
  Wrapper,
  type WrapperVariant,
  type BorderGradientVariant,
} from "@/components/wrapper";
import { Text } from "@/components/text";

import { cn } from "@/lib/utils";

export type InputVariant = WrapperVariant;
export type InputSize = "sm" | "default" | "lg";

export interface InputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "size"
> {
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
  sm: { height: "h-[2.625rem]", text: "text-caption", padding: "px-[1rem]" },
  default: { height: "h-[3.4375rem]", text: "text-body", padding: "px-[1.5rem]" },
  lg: { height: "h-[4rem]", text: "text-body-large", padding: "px-[1.75rem]" },
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
      wrapperClassName,
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
      wrapperClassName,
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
        "flex flex-col gap-2 w-[480px]",
        className,
      );

      const mergedLabelClassName = cn(
        "pl-6 select-none text-left opacity-80 text-body",
        labelClassName,
      );

      return (
        <div className={mergedLabelWrapperClassName} style={layoutStyle}>
          <Text
            as="label"
            htmlFor={inputId}
            className={mergedLabelClassName}
          >
            {label}
          </Text>
          {inputWrapper}
        </div>
      );
    }

    return inputWrapper;
  },
);

Input.displayName = "Input";
