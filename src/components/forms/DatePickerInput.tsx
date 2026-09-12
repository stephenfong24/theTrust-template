import { format } from "date-fns";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { cn } from "../../lib/utils";

interface DatePickerInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  dialogTitle?: string;
}

const calendarStartMonth = new Date(1900, 0, 1);
const calendarEndMonth = new Date(new Date().getFullYear() + 20, 11, 1);

export function DatePickerInput({
  label,
  value,
  onChange,
  required = false,
  disabled = false,
  placeholder = "Select date",
  className,
  buttonClassName,
  dialogTitle
}: DatePickerInputProps) {
  const [open, setOpen] = useState(false);
  const selectedDate = useMemo(() => parseDateValue(value), [value]);
  const [pendingDate, setPendingDate] = useState<Date | undefined>(selectedDate);
  const displayValue = selectedDate ? formatDateValue(selectedDate) : "";

  useEffect(() => {
    if (open) setPendingDate(selectedDate);
  }, [open, selectedDate]);

  const pickerButton = (
    <button
      type="button"
      disabled={disabled}
      onClick={() => setOpen(true)}
      className={cn(
        "mt-1 flex h-11 w-full items-center justify-between gap-3 rounded-lg border border-line bg-white px-3 text-left text-sm text-textPrimary transition hover:border-brandGold focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink disabled:cursor-not-allowed disabled:bg-soft disabled:text-textSecondary",
        !label && "mt-0",
        buttonClassName
      )}
    >
      <span className={displayValue ? "truncate" : "truncate text-textSecondary"}>{displayValue || placeholder}</span>
      <CalendarDays className="h-4 w-4 shrink-0 text-textSecondary" />
    </button>
  );

  return (
    <>
      {label ? (
        <label className={cn("block text-sm font-medium text-textPrimary", className)}>
          {label} {required ? <span className="text-red-600">*</span> : null}
          {pickerButton}
        </label>
      ) : (
        <span className={cn("block", className)}>{pickerButton}</span>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[460px] bg-white p-5">
          <DialogHeader>
            <DialogTitle>{dialogTitle ?? label ?? "Select Date"}</DialogTitle>
            <DialogDescription>Choose a date using the month and year selectors.</DialogDescription>
          </DialogHeader>
          <DayPicker
            mode="single"
            selected={pendingDate}
            defaultMonth={selectedDate ?? new Date()}
            captionLayout="dropdown"
            startMonth={calendarStartMonth}
            endMonth={calendarEndMonth}
            onSelect={setPendingDate}
            components={{ Chevron: DatePickerChevron }}
            classNames={{
              root: "relative w-full",
              months: "flex justify-center",
              month: "w-full",
              month_caption: "mb-4 flex min-h-11 items-center justify-center px-12",
              caption_label: "sr-only",
              dropdowns: "grid w-full max-w-[280px] grid-cols-2 gap-2",
              dropdown_root: "relative inline-flex min-w-0 items-center",
              dropdown:
                "h-10 w-full appearance-none rounded-lg border border-line bg-white px-3 pr-9 text-sm font-semibold text-textPrimary transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink",
              nav: "pointer-events-none absolute inset-x-0 top-0 flex h-11 items-center justify-between",
              button_previous:
                "pointer-events-auto flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-white text-textSecondary transition hover:border-brandGold hover:text-textPrimary",
              button_next:
                "pointer-events-auto flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-white text-textSecondary transition hover:border-brandGold hover:text-textPrimary",
              chevron: "h-4 w-4",
              month_grid: "w-full border-separate border-spacing-1",
              weekdays: "text-xs font-semibold uppercase text-textSecondary",
              weekday: "h-8 text-center",
              week: "",
              day: "p-0 text-center",
              day_button: "h-9 w-9 rounded-lg text-sm font-semibold text-textPrimary transition hover:bg-[#FFF8E1] hover:text-ink focus:outline-none focus:ring-2 focus:ring-brandGold/50",
              today: "text-brandGold",
              selected: "[&>button]:bg-ink [&>button]:text-white [&>button]:hover:bg-ink [&>button]:hover:text-white",
              outside: "text-textSecondary opacity-45",
              disabled: "text-textSecondary opacity-30"
            }}
          />
          <DialogFooter>
            <button
              type="button"
              onClick={() => {
                setPendingDate(undefined);
              }}
              className="h-10 rounded-lg border border-line bg-white px-4 text-sm font-semibold text-textPrimary transition hover:bg-gray-50"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(pendingDate ? formatDateValue(pendingDate) : "");
                setOpen(false);
              }}
              className="h-10 rounded-lg bg-ink px-4 text-sm font-semibold text-white transition hover:bg-black"
            >
              Done
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DatePickerChevron({ orientation }: { orientation?: "up" | "down" | "left" | "right" }) {
  if (orientation === "left") return <ChevronLeft className="h-4 w-4" />;
  if (orientation === "right") return <ChevronRight className="h-4 w-4" />;
  return <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-textSecondary" />;
}

function parseDateValue(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return undefined;
  return date;
}

function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
