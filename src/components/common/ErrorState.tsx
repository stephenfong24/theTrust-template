import { AlertTriangle } from "lucide-react";

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-red-100 bg-red-50 p-5 text-sm text-red-700">
      <div className="flex items-center gap-2 font-semibold">
        <AlertTriangle className="h-4 w-4" />
        Unable to load records.
      </div>
      <button onClick={onRetry} className="mt-3 rounded-lg border border-red-200 bg-white px-3 py-2 font-medium text-red-700">
        Retry
      </button>
    </div>
  );
}
