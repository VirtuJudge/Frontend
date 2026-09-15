"use client";

import React, { useState } from "react";
import { Icon } from "@iconify/react";
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
  showPasswordToggle?: boolean;
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
      wrapperClassName,
      wrapperStyle,
      type = "text",
      showPasswordToggle,
      ...rest
    },
    ref,
  ) {
    const generatedId = React.useId();
    const inputId = id || (label ? generatedId : undefined);
    const sizeConfig = SIZES[size] || SIZES.default;

    const [showPassword, setShowPassword] = useState(false);
    const isPasswordType = type === "password";
    const canTogglePassword = isPasswordType && showPasswordToggle !== false;
    const effectiveType = canTogglePassword
      ? showPassword
        ? "text"
        : "password"
      : type;

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
      "flex-1 min-w-0 bg-transparent border-none outline-none focus:outline-none focus-visible:outline-none text-fg placeholder:text-fg-light/50 leading-none disabled:pointer-events-none w-full caret-fg selection:bg-primary/30 selection:text-fg",
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
          type={effectiveType}
          disabled={disabled}
          aria-disabled={disabled}
          className={mergedInputClassName}
          style={style}
          {...rest}
        />
        {canTogglePassword && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            onMouseDown={(e) => e.preventDefault()}
            disabled={disabled}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            data-testid="password-toggle"
            className="text-fg-light/70 hover:text-primary focus-visible:text-primary transition-colors cursor-pointer p-1 rounded-md flex items-center justify-center shrink-0 ml-2 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon
              icon={showPassword ? "tabler:eye-off" : "tabler:eye"}
              className="w-5 h-5 text-lg"
            />
          </button>
        )}
      </Wrapper>
    );

    if (label) {
      const mergedLabelWrapperClassName = cn(
        "flex flex-col gap-[8px] w-[480px]",
        className,
      );

      const mergedLabelClassName = cn(
        "pl-6 select-none text-left",
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
