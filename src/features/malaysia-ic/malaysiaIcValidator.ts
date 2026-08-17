export interface MalaysiaIcValidationResult {
  isValid: boolean;
  hasValidFormat: boolean;
  hasValidDate: boolean;
  normalized: string | null;
  confidenceAdjustment: number;
  reason?: string;
}

const MALAYSIA_IC_PATTERN = /^\d{6}-\d{2}-\d{4}$/;
const DEMO_IC_PATTERN = /^\d{6}-\d{2}-\d{3,4}$/;

export function validateMalaysiaIc(icNumber: string | null | undefined): MalaysiaIcValidationResult {
  if (!icNumber) {
    return invalid("IC number was not detected.", null, 0);
  }

  const normalized = normalizeMalaysiaIcShape(icNumber);
  if (!normalized || !DEMO_IC_PATTERN.test(normalized)) {
    return invalid("IC number must use YYMMDD-##-#### format.", normalized, 0.15);
  }

  if (!MALAYSIA_IC_PATTERN.test(normalized)) {
    return invalid("IC number looks incomplete. Please verify it.", normalized, 0.25, true);
  }

  const digits = normalized.replace(/\D/g, "");
  const month = Number(digits.slice(2, 4));
  const day = Number(digits.slice(4, 6));

  if (month < 1 || month > 12) {
    return invalid("IC month is outside the valid range.", normalized, 0.35, true);
  }

  if (!isPlausibleMalaysiaIcDay(digits.slice(0, 6))) {
    return invalid("IC date is not plausible.", normalized, 0.45, true);
  }

  if (day < 1 || day > 31) {
    return invalid("IC day is outside the valid range.", normalized, 0.35, true);
  }

  return {
    isValid: true,
    hasValidFormat: true,
    hasValidDate: true,
    normalized,
    confidenceAdjustment: 0.14
  };
}

function invalid(reason: string, normalized: string | null, adjustment: number, hasValidFormat = false): MalaysiaIcValidationResult {
  return {
    isValid: false,
    hasValidFormat,
    hasValidDate: false,
    normalized,
    confidenceAdjustment: adjustment,
    reason
  };
}

function normalizeMalaysiaIcShape(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 11 || digits.length > 12) {
    return null;
  }

  return `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
}

function isPlausibleMalaysiaIcDay(yymmdd: string): boolean {
  const year = Number(yymmdd.slice(0, 2));
  const month = Number(yymmdd.slice(2, 4));
  const day = Number(yymmdd.slice(4, 6));
  const fullYear = year <= new Date().getFullYear() % 100 ? 2000 + year : 1900 + year;
  const date = new Date(fullYear, month - 1, day);

  return date.getFullYear() === fullYear && date.getMonth() === month - 1 && date.getDate() === day;
}
