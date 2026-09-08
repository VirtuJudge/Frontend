import { Text } from "@/components";
import Image from "next/image";

export default function LoadingPage() {
  return (
    <div className="flex flex-col justify-center items-center w-screen h-screen gap-4">
      <Image
        src="/logos/logo-primary.webp"
        alt="Logo"
        width={300}
        height={200}
        aspect-ratio="auto"
      />
      <Text size="lg">Loading...</Text>
    </div>
  );
}
