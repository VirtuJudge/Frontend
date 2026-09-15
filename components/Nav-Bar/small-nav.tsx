"use client";

import { usePathname } from "next/navigation";
import { Icon } from "@iconify/react";
import { Button } from "../button";
import { useLocalStorage } from "@/hooks";
import { DropdownMenu, DropdownMenuItem } from "@/components";
import { NavBrand } from "./nav-brand";
import {
  MAIN_NAV_ITEMS,
  COMPANY_NAV_ITEMS,
  CTA_NAV_ITEM,
  NAV_CONTAINER_CLASS,
  isRouteActive,
} from "./nav-config";
import { useOptionalAuth } from "@/features/auth";

export default function SmallNav() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useLocalStorage<boolean>(
    "small_nav_menu_open",
    false,
  );
  const auth = useOptionalAuth();
  const isAuthenticated = auth?.isAuthenticated ?? false;

  return (
    <div className={NAV_CONTAINER_CLASS}>
      <NavBrand />

      <DropdownMenu
        isOpen={isMenuOpen}
        onOpenChange={setIsMenuOpen}
        align="right"
        variant="glass"
        borderGradient="nav"
        trigger={
          <Button
            borderGradient="nav"
            className="p-3 text-primary h-auto"
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          >
            <Icon
              icon={isMenuOpen ? "mdi:close-outline" : "tabler:layout-list"}
              width={33}
            />
          </Button>
        }
      >
        {MAIN_NAV_ITEMS.map((item) => (
          <DropdownMenuItem
            key={item.href}
            href={item.href}
            className={isRouteActive(pathname, item.href) ? "text-primary" : ""}
            onClick={() => setIsMenuOpen(false)}
          >
            {item.label}
          </DropdownMenuItem>
        ))}

        <div className="flex items-center gap-2 px-1 text-lg font-bold text-fg-light select-none">
          Company
          <hr className="flex-1" />
        </div>

        {COMPANY_NAV_ITEMS.map((item) => (
          <DropdownMenuItem
            key={item.href}
            href={item.href}
            className={isRouteActive(pathname, item.href) ? "text-primary" : ""}
            onClick={() => setIsMenuOpen(false)}
          >
            {item.label}
          </DropdownMenuItem>
        ))}

        {isAuthenticated ? (
          <Button
            variant="primary"
            href="/dashboard"
            className="w-full"
            size="sm"
            onClick={() => setIsMenuOpen(false)}
          >
            My Account
          </Button>
        ) : (
          <Button
            variant="primary"
            href={CTA_NAV_ITEM.href}
            className="w-full"
            size="sm"
            onClick={() => setIsMenuOpen(false)}
          >
            {CTA_NAV_ITEM.label}
          </Button>
        )}
      </DropdownMenu>
    </div>
  );
}
