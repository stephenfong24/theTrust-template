export const afterLifetimePurposeOptions = [
  { key: "afterLifetimeLivingMaintenance", value: "LIVING_MAINTENANCE", label: "Living Maintenance" },
  { key: "afterLifetimeEducationExpenses", value: "EDUCATION_EXPENSES", label: "Education Expenses" },
  { key: "afterLifetimeMedicalHealthcareExpenses", value: "MEDICAL_HEALTHCARE_EXPENSES", label: "Medical Healthcare Expenses" }
] as const;

export type AfterLifetimePurposeKey = (typeof afterLifetimePurposeOptions)[number]["key"];

const referenceCodeOverrides: Record<string, string> = {
  "withdraw to bank account": "TRANSFER_TO_BANK",
  "redeposit as trust asset": "REDEPOSIT_AS_TRUST_ASSET",
  "my personal account": "PERSONAL_ACCOUNT",
  "[a] tin is not issued by the country / jurisdiction of tax residence": "TIN_NOT_ISSUED",
  "[b] unable to provide tin. please explain why you are unable to provide": "UNABLE_TO_PROVIDE",
  "[c] tin is not required by country of tax residence": "TIN_NOT_REQUIRED",
  "sales of asset(s)": "SALES_OF_ASSETS",
  "medical and healthcare expenses": "MEDICAL_HEALTHCARE_EXPENSES",
  "medical healthcare expenses": "MEDICAL_HEALTHCARE_EXPENSES"
};

const displayTextOverrides: Record<string, string> = {
  TRANSFER_TO_BANK: "Withdraw to bank account",
  PAYOUT: "Withdraw to bank account",
  REDEPOSIT_AS_TRUST_ASSET: "Redeposit as trust asset",
  COMPANY_ID: "Company ID",
  PERSONAL_ACCOUNT: "My Personal Account",
  OWN_ACCOUNT: "My Personal Account",
  JOINT_ACCOUNT: "Joint Account",
  THIRD_PARTY: "Third Party",
  TIN_NOT_ISSUED: "[A] TIN is not issued by the country / jurisdiction of tax residence",
  UNABLE_TO_PROVIDE: "[B] Unable to provide TIN. Please explain why you are unable to provide",
  TIN_NOT_REQUIRED: "[C] TIN is not required by country of tax residence",
  SALES_OF_ASSETS: "Sales of asset(s)",
  CURRENT_INCOME: "Current Income",
  INHERITANCE: "Inheritance",
  SALARY: "Current Income",
  SAVINGS: "Current Income",
  BORROWED_CAPITAL: "Borrowed Capital",
  OTHER: "Other",
  SIGNATURE: "Signature",
  PHYSICAL: "Signature",
  THUMBPRINT: "Thumbprint",
  LESS_PROFICIENT_IN_ENGLISH: "Less proficient in English",
  LIVING_MAINTENANCE: "Living Maintenance",
  EDUCATION_EXPENSES: "Education Expenses",
  MEDICAL_HEALTHCARE_EXPENSES: "Medical Healthcare Expenses",
  NONE: "None"
};

export function toReferenceCode(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const override = referenceCodeOverrides[trimmed.toLowerCase()];
  if (override) return override;

  return trimmed
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

export function formatMasterDisplayText(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return "";

  const normalized = toReferenceCode(trimmed);
  if (displayTextOverrides[normalized]) return displayTextOverrides[normalized];

  return normalized
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

export const fromReferenceCode = formatMasterDisplayText;

export function formatAfterLifetimePurpose(value?: string | null) {
  return formatMasterDisplayText(value);
}

export function formatAfterLifetimePurposes(values: string[]) {
  return values.map(formatAfterLifetimePurpose).filter(Boolean).join(", ");
}
