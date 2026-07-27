export function CurrencyDisplay({ value }: { value: number }) {
  return <span>{new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR", maximumFractionDigits: 0 }).format(value)}</span>;
}
