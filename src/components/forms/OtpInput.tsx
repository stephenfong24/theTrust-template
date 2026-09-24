import { useRef, useState, type KeyboardEvent } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";

interface OtpInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  length?: number;
  registration?: UseFormRegisterReturn;
}

export function OtpInput({ label, value, onChange, length = 6, registration }: OtpInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const digits = Array.from({ length }, (_, index) => value[index] ?? "");

  const focusDigit = (index = Math.min(value.length, length - 1)) => {
    setActiveIndex(index);
    inputRef.current?.focus();
    window.setTimeout(() => inputRef.current?.setSelectionRange(index, Math.min(index + 1, value.length)), 0);
  };

  const updateValue = (nextValue: string, cursorPosition: number) => {
    setActiveIndex(Math.min(cursorPosition, length - 1));
    onChange(nextValue);
    window.setTimeout(() => inputRef.current?.setSelectionRange(cursorPosition, cursorPosition), 0);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const selectionStart = input.selectionStart ?? value.length;
    const selectionEnd = input.selectionEnd ?? selectionStart;

    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      const start = Math.min(selectionStart, length - 1);
      const end = value.length >= length && selectionStart === selectionEnd ? Math.min(start + 1, length) : selectionEnd;
      const nextValue = `${value.slice(0, start)}${event.key}${value.slice(end)}`.slice(0, length);
      updateValue(nextValue, Math.min(start + 1, length));
      return;
    }

    if (event.key === "Backspace") {
      event.preventDefault();
      if (selectionStart !== selectionEnd) {
        updateValue(`${value.slice(0, selectionStart)}${value.slice(selectionEnd)}`, selectionStart);
        return;
      }
      if (selectionStart === 0) {
        updateValue(value.slice(1), 0);
        return;
      }
      const start = Math.max(0, selectionStart - 1);
      updateValue(`${value.slice(0, start)}${value.slice(selectionStart)}`, start);
      return;
    }

    if (event.key === "Delete") {
      event.preventDefault();
      updateValue(`${value.slice(0, selectionStart)}${value.slice(selectionEnd || selectionStart + 1)}`, selectionStart);
    }
  };

  return (
    <label className="block text-sm font-medium">
      {label}<span className="ml-1 text-red-600">*</span>
      <span className="relative mt-1 grid max-w-md grid-cols-6 gap-2" onClick={() => focusDigit()}>
        <input
          {...registration}
          ref={(element) => {
            inputRef.current = element;
            registration?.ref(element);
          }}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setFocused(true);
            setActiveIndex(Math.min(value.length, length - 1));
          }}
          onBlur={() => setFocused(false)}
          onSelect={(event) => setActiveIndex(Math.min(event.currentTarget.selectionStart ?? value.length, length - 1))}
          onPaste={(event) => {
            event.preventDefault();
            onChange(event.clipboardData.getData("text"));
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={length}
          aria-label={label}
          className="absolute left-0 top-0 h-px w-px opacity-0"
        />
        {digits.map((digit, index) => (
          <span
            key={index}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              focusDigit(index);
            }}
            className={
              focused && index === activeIndex
                ? "flex h-12 cursor-text items-center justify-center rounded-lg border border-brandGold bg-white text-base font-semibold text-textPrimary shadow-[0_0_0_3px_rgba(212,175,55,0.24)]"
                : digit
                  ? "flex h-12 cursor-text items-center justify-center rounded-lg border border-ink bg-white text-base font-semibold text-textPrimary"
                  : "flex h-12 cursor-text items-center justify-center rounded-lg border border-line bg-white text-base font-semibold text-textPrimary"
            }
          >
            {digit}
          </span>
        ))}
      </span>
    </label>
  );
}
