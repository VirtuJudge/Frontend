"use client";

import { useRouter } from "next/navigation";
import { Button, Text } from "@/components";

export default function NotFoundPage() {
  const router = useRouter();

  return (
    <div className="w-full min-h-screen flex flex-col gap-5 items-center justify-center text-center px-4">
      {" "}
      <h1 className="font-extrabold text-7xl sm:text-9xl text-primary">404</h1>
      <Text as="h2" size="lg" className="font-bold">
        Page Not Found
      </Text>
      <Text size="sm" className="text-foreground/75 leading-relaxed max-w-md">
        The route or resource you are seeking does not exist, has expired, or
        was dismissed. Let&apos;s guide you back to safety.
      </Text>
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2 *:min-w-55">
        <Button variant="primary" href="/home" className="sm:w-auto">
          Go to Home
        </Button>
        <Button
          variant="glass"
          onClick={() => router.back()}
          className="sm:w-auto"
        >
          Return Back
        </Button>
      </div>
    </div>
  );
}
