import { Wrapper } from "../wrapper";

export type ShowcaseFeature = {
  number: string;
  label: string;
  title: string;
  description: string;
  speed: string;
  lag: string;
  placement: string;
};

export const showcaseFeatures: ShowcaseFeature[] = [
  {
    number: "01",
    label: "REHEARSE",
    title: "Practice for the room",
    description:
      "Build confidence with a focused, low-pressure presentation session.",
    speed: "0.82",
    lag: "0.08",
    placement: "lg:col-start-1 lg:row-start-1",
  },
  {
    number: "02",
    label: "REVIEW",
    title: "Notice your delivery",
    description: "Review pacing, pauses, and other observable delivery cues.",
    speed: "1.16",
    lag: "0.14",
    placement: "lg:col-start-4 lg:row-start-1",
  },
  {
    number: "03",
    label: "RESPOND",
    title: "Get ready for Q&A",
    description:
      "Practice answering realistic follow-up questions with clarity.",
    speed: "1.12",
    lag: "0.1",
    placement: "lg:col-start-1 lg:row-start-2",
  },
  {
    number: "04",
    label: "IMPROVE",
    title: "Take the next step",
    description:
      "Turn each session into clear notes for your next presentation.",
    speed: "0.86",
    lag: "0.18",
    placement: "lg:col-start-4 lg:row-start-2",
  },
];

export function ShowcaseFeatureCard({
  feature,
}: {
  feature: ShowcaseFeature;
}) {
  return (
    <Wrapper
      as="article"
      data-speed={feature.speed}
      data-lag={feature.lag}
      className={`group relative isolate col-span-1 flex min-h-44 flex-col justify-between overflow-hidden px-5 py-5 motion-safe:transition-[background-color,box-shadow] motion-safe:duration-500 hover:bg-white/6 hover:shadow-[0_16px_48px_rgba(0,229,204,0.08)] ${feature.placement}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-14 size-36 rounded-full bg-linear-to-br to-transparent blur-2xl motion-safe:transition-transform motion-safe:duration-700 motion-safe:group-hover:scale-125"
      />
      <div className="relative z-10 flex items-center justify-between gap-2">
        <span className="rounded-full border border-primary/20 bg-primary/[0.07] px-3 py-1 text-[0.65rem] font-semibold tracking-[0.18em] text-primary">
          {feature.label}
        </span>
        <span className="font-mono text-xs text-fg/35">{feature.number}</span>
      </div>
      <div className="relative z-10 mt-8">
        <h2 className="text-lg font-semibold leading-snug text-fg">
          {feature.title}
        </h2>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-fg/65">
          {feature.description}
        </p>
      </div>
    </Wrapper>
  );
}
