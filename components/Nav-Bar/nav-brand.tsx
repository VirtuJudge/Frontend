import Image from "next/image";
import { Button } from "../button";

export function NavBrand() {
  return (
    <Button borderGradient="nav" href="/home">
      <Image
        src="/logos/logo-primary.webp"
        alt="VirtuJudge Logo"
        width={60}
        height={27}
        priority
        className="w-auto h-auto"
        style={{ width: "auto", height: "auto" }}
      />
    </Button>
  );
}
