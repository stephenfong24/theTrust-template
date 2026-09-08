import { cloneElement, isValidElement, useState, type HTMLAttributes, type ReactElement, type ReactNode } from "react";

export function TooltipProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function Tooltip({ children }: { children: ReactNode }) {
  return <span className="relative inline-flex">{children}</span>;
}

export function TooltipTrigger({ children }: { children: ReactElement<HTMLAttributes<HTMLElement>> }) {
  const [open, setOpen] = useState(false);

  if (!isValidElement(children)) return children;

  return cloneElement(children, {
    "aria-describedby": open ? "tooltip-content" : undefined,
    onBlur: (event: React.FocusEvent<HTMLElement>) => {
      setOpen(false);
      children.props.onBlur?.(event);
    },
    onFocus: (event: React.FocusEvent<HTMLElement>) => {
      setOpen(true);
      children.props.onFocus?.(event);
    },
    onMouseEnter: (event: React.MouseEvent<HTMLElement>) => {
      setOpen(true);
      children.props.onMouseEnter?.(event);
    },
    onMouseLeave: (event: React.MouseEvent<HTMLElement>) => {
      setOpen(false);
      children.props.onMouseLeave?.(event);
    },
    "data-tooltip-open": open ? "true" : "false"
  });
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
