"use client";

import { Button } from "../button";
import { NavBrand } from "./nav-brand";
import { NAV_CONTAINER_CLASS } from "./nav-config";
import { useAuth } from "@/features/auth/auth-context";

export default function MeNavBar() {
  const { signOut } = useAuth();

  return (
    <header className="w-full">
      <div className={NAV_CONTAINER_CLASS}>
        <NavBrand href="/home" />

        <div className="flex items-center gap-3">
          <Button
            variant="glass"
            borderGradient="nav"
            onClick={() => signOut()}
            aria-label="Logout"
          >
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
