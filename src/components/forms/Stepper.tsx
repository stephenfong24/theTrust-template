export function Stepper({ steps, active }: { steps: string[]; active: number }) {
  return (
    <ol className="grid gap-2 md:grid-cols-4">
      {steps.map((step, index) => (
        <li key={step} className={index === active ? "rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-white" : "rounded-lg border border-line px-3 py-2 text-xs text-textSecondary"}>
          {index + 1}. {step}
        </li>
      ))}
    </ol>
  );
}
