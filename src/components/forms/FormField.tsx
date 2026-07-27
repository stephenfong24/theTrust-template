export function FormField({ label, help }: { label: string; help?: string }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3" />
      {help ? <span className="mt-1 block text-xs text-textSecondary">{help}</span> : null}
    </label>
  );
}
