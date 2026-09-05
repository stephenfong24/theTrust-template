import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";

interface PasswordInputProps {
  label: string;
  registration: UseFormRegisterReturn;
  autoComplete?: string;
  required?: boolean;
}

export function PasswordInput({ label, registration, autoComplete, required = true }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="block text-sm font-medium">
      {label} {required ? <span className="text-red-600">*</span> : null}
      <span className="relative mt-1 block">
        <input
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          {...registration}
          className="h-11 w-full rounded-lg border border-line bg-white px-3 pr-11 transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-textSecondary hover:bg-gray-100 hover:text-textPrimary"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </span>
    </label>
  );
}
