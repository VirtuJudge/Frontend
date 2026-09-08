import { Text, Button } from "@/components";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
      <Text as="h1" size="lg" className="font-bold">
        Welcome to VirtuJudge
      </Text>
      <Text size="md" className="text-foreground/70 max-w-xl">
        AI-assisted pitch analysis, rehearsal, and objective scoring for startup
        founders and presenters.
      </Text>
      <div className="flex gap-4">
        <Button href="/dashboard" variant="primary">
          Try Now
        </Button>
        <Button href="/about" variant="glass">
          About Us
        </Button>
      </div>
    </div>
  );
}
