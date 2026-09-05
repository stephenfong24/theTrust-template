import { Loader2 } from "lucide-react";

interface SubmitButtonProps {
  children: React.ReactNode;
  loading?: boolean;
  loadingText?: string;
  fullWidth?: boolean;
}

export function SubmitButton({ children, loading = false, loadingText = "Submitting...", fullWidth = true }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={loading}
      className={`${fullWidth ? "w-full" : ""} inline-flex h-11 items-center justify-center rounded-lg bg-ink px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}
