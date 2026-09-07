"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Icon } from "@iconify/react";
import { Button } from "../button";
import { DropdownMenu, DropdownMenuItem } from "@/components/dropdown-menu";
import { cn } from "@/lib/utils";
import { NavBrand } from "./nav-brand";
import {
  MAIN_NAV_ITEMS,
  COMPANY_NAV_ITEMS,
  CTA_NAV_ITEM,
  NAV_CONTAINER_CLASS,
  isRouteActive,
  isCompanyRouteActive,
} from "./nav-config";

export default function FullNav() {
  const pathname = usePathname();
  const [isCompanyOpen, setIsCompanyOpen] = useState(false);
  const isCompanyActive = isCompanyRouteActive(pathname);

  return (
    <div className={NAV_CONTAINER_CLASS}>
      <NavBrand />

      <div className="flex gap-4">
        {MAIN_NAV_ITEMS.map((item) => (
          <Button
            key={item.href}
            href={item.href}
            borderGradient="nav"
            className={isRouteActive(pathname, item.href) ? "text-primary" : ""}
          >
            {item.label}
          </Button>
        ))}

        <DropdownMenu
          align="center"
          variant="glass"
          borderGradient="nav"
          isOpen={isCompanyOpen}
          onOpenChange={setIsCompanyOpen}
          trigger={
            <Button
              borderGradient="nav"
              className={isCompanyActive ? "text-primary" : ""}
              aria-expanded={isCompanyOpen}
            >
              Company
              <Icon
                icon="majesticons:arrow-left-circle-line"
                className={cn(
                  "transition-transform duration-200 text-[20px]",
                  isCompanyOpen && "rotate-180",
                )}
              />
            </Button>
          }
        >
          {COMPANY_NAV_ITEMS.map((item) => (
            <DropdownMenuItem
              key={item.href}
              href={item.href}
              className={
                isRouteActive(pathname, item.href) ? "text-primary" : ""
              }
              onClick={() => setIsCompanyOpen(false)}
            >
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenu>
      </div>

      <Button variant="primary" href={CTA_NAV_ITEM.href}>
        {CTA_NAV_ITEM.label}
      </Button>
    </div>
  );
}
