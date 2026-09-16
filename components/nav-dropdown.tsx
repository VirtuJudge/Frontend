"use client";

import React, { useState, useRef, useEffect } from "react";
import { Icon } from "@iconify/react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Button } from "./button";
import { Wrapper } from "./wrapper";
import { useClickOutside } from "@/hooks";
import { cn } from "@/lib/utils";

export interface NavDropdownOption {
  id: string;
  label: string;
  sublabel?: string;
  href?: string;
  onClick?: () => void;
  isActive?: boolean;
  icon?: string;
}

export interface NavDropdownProps {
  label?: string;
  prefix?: string;
  icon?: string;
  options: NavDropdownOption[];
  footerAction?: {
    label: string;
    onClick: () => void;
    icon?: string;
  };
  align?: "left" | "center" | "right";
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
  chevronPosition?: "left" | "right";
}

export function NavDropdown({
  label,
  prefix,
  options,
  icon = "material-symbols:keyboard-arrow-down-rounded",
  footerAction,
  align = "left",
  className,
  buttonClassName,
  menuClassName,
  placeholder = "Select...",
  disabled = false,
  ariaLabel,
}: NavDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  useClickOutside(containerRef, () => setIsOpen(false), isOpen);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

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
      opacity: 0,
    },
    animate: {
      scale: 1,
      y: 0,
      opacity: 1,
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
      opacity: 0,
      transition: {
        duration: 0.15,
        ease: [0.32, 0, 0.67, 0] as const,
      },
    },
  };

  const explicitlyActiveOption = options.find((opt) => opt.isActive);
  const locallySelectedOption = selectedId
    ? options.find((opt) => opt.id === selectedId)
    : undefined;
  const chosenOption = explicitlyActiveOption ?? locallySelectedOption;
  const defaultOption = options.length > 0 ? options[0] : undefined;
  const effectiveOption = chosenOption ?? defaultOption;

  const displayText = label || effectiveOption?.label || placeholder;

  const isOptionActive = (opt: NavDropdownOption, index: number) => {
    if (explicitlyActiveOption) {
      return opt.isActive ?? false;
    }
    if (locallySelectedOption) {
      return opt.id === locallySelectedOption.id;
    }
    return index === 0;
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative inline-block", className)}
    >
      <Button
        variant="glass"
        size="default"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel || `${prefix || "Menu"}: ${displayText}`}
        className={cn(
          "flex items-center gap-1.5 sm:gap-2 transition-all max-w-75 sm:max-w-9 z-5",
          isOpen && "text-primary brightness-100",
          buttonClassName,
        )}
      >
        <Icon
          icon={icon}
          className="shrink-0 text-3xl"
        />
        <span className="truncate text-left flex-1 font-bold">
          {displayText}
        </span>
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={menuVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{ willChange: "transform" }}
            className={cn(
              "absolute top-full mt-3 z-50 min-w-50 sm:min-w-60 max-w-80 w-max",
              originClass,
              alignmentClasses,
            )}
          >
            <Wrapper
              variant="dark"
              borderGradient="nav"
              className={cn(
                "flex flex-col rounded-3xl p-2.5 gap-1 shadow-2xl text-foreground",
                menuClassName,
              )}
            >
              <div
                role="listbox"
                className="flex flex-col gap-1 max-h-65 overflow-y-auto pr-1"
              >
                {options.length === 0 ? (
                  <div className="px-3 py-2 text-foreground/50 italic">
                    No items available
                  </div>
                ) : (
                  options.map((opt, idx) => {
                    const active = isOptionActive(opt, idx);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="option"
                        aria-selected={active}
                        onClick={() => {
                          setSelectedId(opt.id);
                          opt.onClick?.();
                          setIsOpen(false);
                        }}
                        className={cn(
                          "flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-left transition-colors font-semibold w-full cursor-pointer",
                          active
                            ? "bg-primary/15 text-primary"
                            : "hover:bg-foreground/10 hover:text-primary",
                        )}
                      >
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="truncate text-lg font-medium">
                            {opt.label}
                          </span>
                          {opt.sublabel && (
                            <span className="truncate opacity-60 font-normal">
                              {opt.sublabel}
                            </span>
                          )}
                        </div>
                        {active && (
                          <Icon
                            icon="majesticons:check-line"
                            className="text-primary text-base shrink-0"
                          />
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              {footerAction && (
                <>
                  <div className="h-px bg-foreground/10 my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      footerAction.onClick();
                      setIsOpen(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-left text-sm font-semibold text-primary hover:bg-primary/10 transition-colors w-full cursor-pointer"
                  >
                    {footerAction.icon && (
                      <Icon
                        icon={footerAction.icon}
                        className="text-base shrink-0"
                      />
                    )}
                    <span>{footerAction.label}</span>
                  </button>
                </>
              )}
            </Wrapper>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
