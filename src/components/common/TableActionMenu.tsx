import { MoreHorizontal } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface TableActionMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ariaLabel: string;
  children: ReactNode;
  widthClassName?: string;
}

export function TableActionMenu({ open, onOpenChange, ariaLabel, children, widthClassName = "w-48" }: TableActionMenuProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger) return;

      const triggerRect = trigger.getBoundingClientRect();
      const menuWidth = menu?.offsetWidth ?? 192;
      const menuHeight = menu?.offsetHeight ?? 96;
      const gap = 8;
      const viewportPadding = 12;
      const spaceBelow = window.innerHeight - triggerRect.bottom;
      const shouldOpenUpward = spaceBelow < menuHeight + gap && triggerRect.top > menuHeight + gap;
      const top = shouldOpenUpward ? triggerRect.top - menuHeight - gap : triggerRect.bottom + gap;
      const left = Math.min(
        Math.max(viewportPadding, triggerRect.right - menuWidth),
        window.innerWidth - menuWidth - viewportPadding
      );

      setPosition({ top: Math.max(viewportPadding, top), left });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest("[data-action-menu-root]")) return;
      onOpenChange(false);
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [onOpenChange, open]);

  return (
    <div data-action-menu-root>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => onOpenChange(!open)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line text-textSecondary hover:bg-gray-100"
        aria-label={ariaLabel}
        aria-expanded={open}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              data-action-menu-root
              className={`fixed z-50 rounded-lg border border-line bg-white p-2 shadow-soft ${widthClassName}`}
              style={{ top: position.top, left: position.left }}
            >
              {children}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
