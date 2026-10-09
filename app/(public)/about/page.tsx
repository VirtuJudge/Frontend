import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components";

export const metadata: Metadata = {
  title: "About VirtuJudge",
  description:
    "Learn how VirtuJudge helps founders and student teams practice important presentations and improve with clear, grounded feedback.",
};

const steps = [
  {
    number: "01",
    title: "Bring your pitch",
    detail:
      "Start a project, record your presentation, and attach a pitch deck or other supporting material.",
  },
  {
    number: "02",
    title: "Practice the questions",
    detail:
      "Work through judge-style questions connected to the pitch and supporting material.",
  },
  {
    number: "03",
    title: "Choose what to improve",
    detail:
      "Review a report with team feedback, presenter feedback, and practical recommendations for the next round.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-20 pb-20">
      <section className="flex flex-col items-start gap-6 pt-8 sm:pt-12">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">
          About VirtuJudge
        </p>
        <h1 className="max-w-4xl text-4xl font-bold leading-tight tracking-tight text-fg sm:text-6xl">
          Practice the pitch before it counts.
        </h1>
        <p className="max-w-3xl text-lg leading-relaxed text-fg/75 sm:text-xl">
          VirtuJudge is building AI-assisted presentation practice for founders
          and student teams. Rehearse the pitch, prepare for the questions a
          judge may ask, and get clear feedback on what to strengthen next.
        </p>
        <div className="flex flex-wrap items-center gap-4 pt-2">
          <Button href="/auth/login" variant="primary" size="lg">
            Try VirtuJudge
          </Button>
          <Link
            href="/#product-demo"
            className="rounded-full border border-primary/30 px-6 py-3 font-semibold text-fg transition-colors hover:border-primary hover:text-primary"
          >
            Watch the product demo
          </Link>
        </div>
      </section>

      <section className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">
            How it works
          </p>
          <h2 className="text-3xl font-bold text-fg sm:text-4xl">
            A practice round with a useful next step
          </h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {steps.map((step) => (
            <article
              key={step.number}
              className="flex flex-col gap-4 rounded-3xl border border-primary/15 bg-white/[0.035] p-6 sm:p-7"
            >
              <span className="text-sm font-bold tracking-[0.12em] text-primary">
                {step.number}
              </span>
              <h3 className="text-xl font-bold text-fg">{step.title}</h3>
              <p className="leading-relaxed text-fg/70">{step.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-8 rounded-3xl border border-primary/15 bg-bg-light/70 p-7 sm:p-10 md:grid-cols-[0.8fr_1.2fr]">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">
            Feedback with context
          </p>
          <h2 className="text-3xl font-bold text-fg">Useful, specific, and grounded</h2>
        </div>
        <p className="text-lg leading-relaxed text-fg/75">
          Good coaching points to something the team can act on. VirtuJudge is
          designed to connect feedback to the presentation, supporting material,
          and answers from the practice round, so teams can see what landed and
          what still needs a clearer explanation.
        </p>
      </section>

      <section className="flex flex-col gap-4 border-t border-white/10 pt-10">
        <h2 className="text-2xl font-bold text-fg">Built for the next opportunity</h2>
        <p className="max-w-3xl text-lg leading-relaxed text-fg/70">
          A pitch gets better through practice. We want teams to be able to
          rehearse, learn from each round, and walk into the next presentation
          with a stronger story and better-prepared answers.
        </p>
      </section>
    </div>
  );
}
