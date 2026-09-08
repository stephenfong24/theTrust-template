import { useState, type ReactNode } from "react";

export function TooltipProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function Tooltip({ children }: { children: ReactNode }) {
  return <span className="relative inline-flex">{children}</span>;
}

export function TooltipTrigger({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <span
      tabIndex={0}
      aria-describedby={open ? "tooltip-content" : undefined}
      data-tooltip-open={open ? "true" : "false"}
      onBlur={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      className="inline-flex"
    >
      {children}
    </span>
  );
}

export function TooltipContent({ children }: { children: ReactNode }) {
  return (
    <span
      id="tooltip-content"
      role="tooltip"
      className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2.5 py-1.5 text-xs font-semibold text-white shadow-soft [span[data-tooltip-open=true]+&]:block"
    >
      {children}
    </span>
  );
}
