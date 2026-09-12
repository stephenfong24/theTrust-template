import type { CSSProperties } from "react";

export function Stepper({ steps, active }: { steps: string[]; active: number }) {
  return (
    <ol
      className="grid w-full min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-[repeat(var(--step-count),minmax(0,1fr))]"
      style={{ "--step-count": steps.length } as CSSProperties}
    >
      {steps.map((step, index) => {
        const activeStep = index === active;
        const completed = index < active;
        const lineClass = completed || activeStep ? "bg-brandGold" : "bg-line";
        const circleClass = activeStep
          ? "border-brandGold bg-brandGold text-ink shadow-[0_0_0_4px_rgba(212,175,55,0.16)]"
          : completed
            ? "border-ink bg-ink text-white"
            : "border-line bg-white text-textSecondary";
        const itemClass = activeStep
          ? "border-ink bg-ink text-white shadow-[0_14px_30px_rgba(17,17,17,0.16)]"
          : completed
            ? "border-ink/20 bg-white text-textPrimary"
            : "border-line bg-white text-textSecondary";

        return (
          <li
            key={step}
            className={`relative flex min-h-[68px] min-w-0 items-center gap-2 rounded-lg border px-3 py-2.5 transition ${itemClass}`}
          >
            {index < steps.length - 1 ? (
              <span className={`pointer-events-none absolute left-[calc(100%-4px)] top-1/2 z-0 hidden h-[2px] w-4 -translate-y-1/2 lg:block ${lineClass}`} />
            ) : null}
            <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${circleClass}`}>
              {index + 1}
            </span>
            <span className="relative z-10 min-w-0 max-w-full">
              <span className={activeStep ? "block text-[11px] font-semibold uppercase tracking-wide text-brandGold" : "block text-[11px] font-semibold uppercase tracking-wide text-textSecondary"}>
                Step {index + 1}
              </span>
              <span className="mt-0.5 block truncate text-sm font-semibold">{step}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
