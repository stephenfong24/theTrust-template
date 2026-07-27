import { format } from "date-fns";

export function DateDisplay({ value }: { value: string }) {
  return <span>{format(new Date(value), "dd MMM yyyy")}</span>;
}
