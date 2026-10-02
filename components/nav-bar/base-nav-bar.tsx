"use client";

import { Button } from "@/components";
import { NavBrand } from "./nav-brand";
import { NAV_CONTAINER_CLASS } from "./nav-config";
import { cn } from "@/lib/utils";

export function BaseNavBar() {
  return (
    <header className="w-full">
      <div className={cn(NAV_CONTAINER_CLASS)}>
        <NavBrand href="/home" />

        <div className="flex items-center gap-3">
          <Button
            variant="glass"
            borderGradient="nav"
            href="/me"
            aria-label="Go to My Account"
          >
            My account
          </Button>
        </div>
      </div>
    </header>
  );
}
