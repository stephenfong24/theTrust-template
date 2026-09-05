import { X } from "lucide-react";
import type { ReactNode } from "react";

export function Modal({ open, title, children, onClose }: { open: boolean; title: string; children: ReactNode; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true">
      <div className="relative w-full max-w-lg overflow-hidden rounded-lg border border-brandGold/30 bg-soft p-5 shadow-[0_28px_80px_rgba(17,17,17,0.28)] before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-brandGold">
        <div className="mb-4 flex items-center justify-between border-b border-line pb-4">
          <h2 className="text-lg font-semibold text-textPrimary">{title}</h2>
          <button aria-label="Close" onClick={onClose} className="rounded-lg p-2 text-textSecondary hover:bg-white hover:text-textPrimary">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
