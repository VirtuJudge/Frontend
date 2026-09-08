"use client";

import { Button, Text, Wrapper } from "@/components";
import { useAuth } from "@/features/auth";

export default function DashboardPage() {
  const { user, signOut } = useAuth();

  return (
    <div className="flex flex-col gap-8 w-full max-w-6xl mx-auto pb-12">
      <Wrapper
        variant="glass"
        borderGradient="primary"
        className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 rounded-2xl"
      >
        <div>
          <Text as="h1" size="lg" className="font-bold">
            Hello, Dashboard
          </Text>
          <Text size="sm" className="text-foreground/70 mt-1">
            Welcome back, {user?.display_name}.
          </Text>
          <Text size="sm" className="text-foreground/70 mt-1">
            Welcome back, {user?.email}.
          </Text>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="danger"
            size="sm"
            onClick={() => signOut()}
          >
            Sign Out
          </Button>
        </div>
      </Wrapper>
    </div>
  );
}

