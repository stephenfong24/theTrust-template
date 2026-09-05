export function Stepper({ steps, active }: { steps: string[]; active: number }) {
  return (
    <ol className="grid gap-3 md:grid-cols-4">
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
            className={`relative flex min-h-[76px] items-center gap-3 rounded-lg border px-4 py-3 transition ${itemClass}`}
          >
            {index < steps.length - 1 ? (
              <span className={`pointer-events-none absolute left-[calc(100%-6px)] top-1/2 z-0 hidden h-[2px] w-5 -translate-y-1/2 md:block ${lineClass}`} />
            ) : null}
            <span className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${circleClass}`}>
              {index + 1}
            </span>
            <span className="relative z-10 min-w-0">
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
