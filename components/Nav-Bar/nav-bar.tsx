"use client";

import SmallNav from "./small-nav";
import FullNav from "./full-nav";

export default function NavBar() {
  return (
    <header className="w-full">
      <div className="block min-[1080px]:hidden">
        <SmallNav />
      </div>
      <div className="hidden min-[1080px]:block">
        <FullNav />
      </div>
    </header>
  );
}
