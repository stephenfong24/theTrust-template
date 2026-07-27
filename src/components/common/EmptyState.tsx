import { Inbox } from "lucide-react";

export function EmptyState({ title = "No records found", description = "Adjust the filters or add a new record." }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line bg-white p-8 text-center">
      <Inbox className="h-10 w-10 text-textSecondary" />
      <h3 className="mt-3 text-base font-semibold text-textPrimary">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-textSecondary">{description}</p>
    </div>
  );
}
