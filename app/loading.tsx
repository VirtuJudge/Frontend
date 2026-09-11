import { Text } from "@/components";
import { Icon } from "@iconify/react";
import Image from "next/image";

export default function LoadingPage() {
  return (
    <div className="w-full min-h-[calc(100vh-300px)] flex flex-col gap-5 items-center justify-center text-center px-4">
      <Image
        src="/logos/logo-primary.webp"
        alt="VirtuJudge Logo"
        width={300}
        height={136}
        priority
        className="w-auto h-auto"
        style={{ width: "auto", height: "auto" }}
      />
      <Text size="lg">Loading</Text>
      <Icon
        icon="eos-icons:bubble-loading"
        width="32"
        height="32"
        className="text-primary"
      />
    </div>
  );
}
