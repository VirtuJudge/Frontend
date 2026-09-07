import Image from "next/image";
import { Button } from "../button";

export function NavBrand() {
  return (
    <Button borderGradient="nav" href="/">
      <Image
        src="/logos/logo-primary.webp"
        alt="Logo"
        height={50}
        width={60}
        priority
      />
    </Button>
  );
}
