import { Wrapper } from "../wrapper";

const practiceSteps = ["Rehearse", "Reflect", "Repeat"];

export default function PracticeFlowCard() {
  return (
    <Wrapper
      as="article"
      data-speed="0.94"
      data-lag="0.2"
      className="relative isolate col-span-2 overflow-hidden px-5 py-5 sm:px-7 lg:col-span-4"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-sm">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-primary">
            A simple rhythm
          </p>
          <h2 className="mt-1 text-lg font-semibold text-fg">
            Practice. Review. Grow.
          </h2>
        </div>
        <ol className="grid flex-1 grid-cols-3 gap-2 sm:max-w-2xl sm:gap-4">
          {practiceSteps.map((label, index) => (
            <li
              key={label}
              className="flex flex-col items-start gap-1 rounded-2xl border border-white/[0.07] bg-white/2.5 px-3 py-2 sm:flex-row sm:items-center sm:gap-3 sm:px-5 sm:py-3"
            >
              <span className="font-mono text-xs text-primary/80">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="text-xs font-medium text-fg/80 sm:text-sm">
                {label}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </Wrapper>
  );
}
