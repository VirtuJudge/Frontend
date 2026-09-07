"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  Wrapper,
  type WrapperVariant,
  type BorderGradientVariant,
} from "./wrapper";
import { useClickOutside } from "@/hooks";
import { cn } from "@/lib/utils";

export interface DropdownMenuItemProps {
  label?: React.ReactNode;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  href?: string;
  disabled?: boolean;
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
}

export interface DropdownMenuProps {
  trigger: React.ReactNode;
  items?: DropdownMenuItemProps[];
  children?: React.ReactNode;
  align?: "left" | "right" | "center";
  variant?: WrapperVariant;
  borderGradient?: BorderGradientVariant;
  className?: string;
  menuClassName?: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function DropdownMenuItem({
  label,
  children,
  icon,
  href,
  disabled = false,
  className,
  onClick,
}: DropdownMenuItemProps) {
  const content = children || label;

  const baseItemClasses = cn(
    "hover:text-primary px-1 flex items-center gap-3 font-bold text-lg w-full text-left transition-all duration-150 select-none",
    className,
  );

  if (href && !disabled) {
    return (
      <Link href={href} className={baseItemClasses} onClick={onClick}>
        {icon && <span className="shrink-0 text-[18px]">{icon}</span>}
        <span className="flex-1 truncate">{content}</span>
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={baseItemClasses}
    >
      {icon && <span className="shrink-0 text-[18px]">{icon}</span>}
      <span className="flex-1 truncate">{content}</span>
    </button>
  );
}

export function DropdownMenu({
  trigger,
  items,
  children,
  align = "left",
  variant = "glass",
  borderGradient = "default",
  className,
  isOpen: controlledIsOpen,
  onOpenChange,
}: DropdownMenuProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledIsOpen !== undefined;
  const open = isControlled ? controlledIsOpen : internalOpen;

  const menuRef = useRef<HTMLDivElement>(null);

  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setInternalOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange],
  );

  useClickOutside(menuRef, () => setOpen(false), open);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, setOpen]);

  const alignmentClasses = {
    left: "left-0",
    right: "right-0",
    center: "left-1/2 -translate-x-1/2",
  }[align];

  const originClass = {
    left: "origin-top-left",
    right: "origin-top-right",
    center: "origin-top",
  }[align];

  const menuVariants: Variants = {
    initial: {
      scale: 0.94,
      y: -8,
    },
    animate: {
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 28,
        mass: 0.6,
      },
    },
    exit: {
      scale: 0.95,
      y: -6,
      transition: {
        duration: 0.15,
        ease: [0.32, 0, 0.67, 0] as const,
      },
    },
  };

  return (
    <div ref={menuRef} className={cn("relative inline-block z-50", className)}>
      <div
        onClick={() => setOpen(!open)}
        className="inline-flex cursor-pointer"
      >
        {trigger}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            variants={menuVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{ willChange: "transform" }}
            className={cn(
              "absolute top-full mt-4 z-50 w-60",
              originClass,
              alignmentClasses,
            )}
          >
            <Wrapper
              variant={variant}
              borderGradient={borderGradient}
              className="flex flex-col min-w-50 rounded-[35px] p-5 gap-3"
            >
              {items?.map((item, index) => (
                <DropdownMenuItem
                  key={index}
                  {...item}
                  onClick={(e) => {
                    item.onClick?.(e);
                    setOpen(false);
                  }}
                />
              ))}
              {children}
            </Wrapper>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
