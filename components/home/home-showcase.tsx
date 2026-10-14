import ScrollReveal from "../scroll-reveal";
import AlphaAnnouncementCard from "./alpha-announcement-card";
import PracticeFlowCard from "./practice-flow-card";
import { showcaseFeatures, ShowcaseFeatureCard } from "./showcase-features";

export default function HomeShowcase() {
  return (
    <ScrollReveal className="w-full">
      <section
        aria-label="Explore VirtuJudge"
        className="relative isolate mx-auto w-full max-w-6xl"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/3 -z-10 h-72 w-3/4 -translate-x-1/2 rounded-full bg-primary/8 blur-[100px]"
        />
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4 lg:grid-rows-[minmax(11rem,auto)_minmax(11rem,auto)_auto]">
          <AlphaAnnouncementCard />
          {showcaseFeatures.map((feature) => (
            <ShowcaseFeatureCard key={feature.number} feature={feature} />
          ))}
          <PracticeFlowCard />
        </div>
      </section>
    </ScrollReveal>
  );
}
