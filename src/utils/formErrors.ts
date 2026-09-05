import type { FieldErrors, FieldValues } from "react-hook-form";

export function getFirstFormError<T extends FieldValues>(errors: FieldErrors<T>, fallback = "Please check the form and try again."): string {
  for (const value of Object.values(errors)) {
    if (!value) continue;
    if ("message" in value && typeof value.message === "string") return value.message;
    if (typeof value === "object") {
      const nested: string = getFirstFormError(value as FieldErrors<FieldValues>, fallback);
      if (nested) return nested;
    }
  }
  return fallback;
}
