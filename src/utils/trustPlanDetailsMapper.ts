import type { TrustProductDetailsResponse } from "../api/trustPlanApi";
import type { CommissionTier, TrustExecutionRank, TrustPlan } from "../types/trustPlan";
import { createEmptyTrustPlan } from "./trustPlanDefaults";

export function mapTrustProductDetailsToPlan(details: TrustProductDetailsResponse): TrustPlan {
  const base = createEmptyTrustPlan();
  const steps = asRecord(details.Steps);
  const step1 = asRecord(read(steps, "Step1BasicInformation", "step1BasicInformation"));
  const step2 = asRecord(read(steps, "Step2PaymentAndFees", "step2PaymentAndFees"));
  const step3 = asRecord(read(steps, "Step3TenureAndWithdrawal", "step3TenureAndWithdrawal"));
  const step4 = asRecord(read(steps, "Step4DividendReturn", "step4DividendReturn"));
  const step5 = asRecord(read(steps, "Step5DividendPayout", "step5DividendPayout"));
  const step6 = asRecord(read(steps, "Step6BonusConfiguration", "step6BonusConfiguration"));
  const step7 = asRecord(read(steps, "Step7CommissionConfiguration", "step7CommissionConfiguration"));
  const step8 = asRecord(read(steps, "Step8CommissionRules", "step8CommissionRules"));
  const step9 = asRecord(read(steps, "Step9ComplimentaryBenefits", "step9ComplimentaryBenefits"));
  const paymentConfig = asRecord(read(step2, "PaymentConfig", "paymentConfig"));
  const returnConfig = asRecord(read(step4, "Configuration", "configuration"));
  const commissionConfig = asRecord(read(step7, "Configuration", "configuration", "OneOff", "oneOff"));
  const maximumPlacement = toOptionalNumber(read(step1, "MaximumPlacement", "maximumPlacement"));

  return {
    ...base,
    id: details.ProductCode || base.id,
    basicInfo: {
      ...base.basicInfo,
      productCode: details.ProductCode || "",
      productName: toStringValue(read(step1, "ProductName", "productName")),
      productCategory: toStringValue(read(step1, "ProductCategory", "productCategory")),
      productDescription: toStringValue(read(step1, "ProductDescription", "productDescription")),
      minimumPlacement: toNumber(read(step1, "MinimumPlacement", "minimumPlacement")),
      maximumPlacement,
      noMaximum: maximumPlacement === undefined,
      fundManagementPeriod: toNumber(read(step1, "FundManagementPeriod", "fundManagementPeriod")),
      fundManagementPeriodUnit: mapPeriodUnit(read(step1, "FundManagementPeriodUnit", "fundManagementPeriodUnit")),
      productStatus: mapStatus(read(step1, "ProductStatus", "productStatus")),
      allowNewSubscription: mapStatus(read(step1, "ProductStatus", "productStatus")) === "Active",
      executionRanks: toStringArray(read(step1, "ExecutionRanks", "executionRanks")) as TrustExecutionRank[]
    },
    paymentConfig: {
      ...base.paymentConfig,
      paymentFrequency: mapPaymentFrequency(read(paymentConfig, "PaymentFrequency", "paymentFrequency"))
    },
    fees: toArray(read(step2, "Fees", "fees")).map((fee, index) => {
      const feeRecord = asRecord(fee);
      return {
        id: `${details.ProductCode || "FEE"}-${index}`,
        feeType: formatReferenceLabel(read(feeRecord, "FeeType", "feeType")),
        rateType: mapRateType(read(feeRecord, "RateType", "rateType")),
        value: toNumber(read(feeRecord, "Value", "value")),
        chargeTiming: formatReferenceLabel(read(feeRecord, "ChargeTiming", "chargeTiming"))
      };
    }),
    tenureConfig: {
      ...base.tenureConfig,
      lockInPeriod: toNumber(read(step3, "LockInPeriod", "lockInPeriod")),
      lockInPeriodUnit: mapPeriodUnit(read(step3, "LockInPeriodUnit", "lockInPeriodUnit")),
      allowEarlyWithdrawal: toBoolean(read(step3, "AllowEarlyWithdrawal", "allowEarlyWithdrawal")),
      earlyWithdrawalFeeType: mapRateType(read(step3, "EarlyWithdrawalFeeType", "earlyWithdrawalFeeType")),
      earlyWithdrawalFeeValue: toOptionalNumber(read(step3, "EarlyWithdrawalFeeValue", "earlyWithdrawalFeeValue"))
    },
    returnConfig: {
      ...base.returnConfig,
      method: mapReturnMethod(read(step4, "Method", "method")),
      matrixTiers: toArray(read(returnConfig, "Tiers", "tiers", "MatrixTiers", "matrixTiers") ?? read(step4, "MatrixTiers", "matrixTiers")).map((tier, index) => {
        const tierRecord = asRecord(tier);
        const tierMaximum = toOptionalNumber(read(tierRecord, "MaximumPlacement", "maximumPlacement"));
        return {
          id: `${details.ProductCode || "MATRIX"}-${index}`,
          minimumPlacement: toNumber(read(tierRecord, "MinimumPlacement", "minimumPlacement")),
          maximumPlacement: tierMaximum,
          noMaximum: tierMaximum === undefined,
          yearlyRates: toYearlyRates(read(tierRecord, "YearlyRates", "yearlyRates"))
        };
      })
    },
    payoutConfig: {
      ...base.payoutConfig,
      payoutFrequency: mapPayoutFrequency(read(step5, "PayoutFrequency", "payoutFrequency")),
      calculationStart: "From Commencement Date",
      allowDividendRedeposit: toBoolean(read(step5, "AllowDividendRedeposit", "allowDividendRedeposit"))
    },
    hasBonusReturn: toBoolean(read(step6, "HasBonusReturn", "hasBonusReturn")),
    bonusRules: toArray(read(step6, "BonusRules", "bonusRules")).map((rule, index) => {
      const ruleRecord = asRecord(rule);
      return {
        id: `${details.ProductCode || "BONUS"}-${index}`,
        bonusName: toStringValue(read(ruleRecord, "BonusName", "bonusName")),
        triggerType: formatReferenceLabel(read(ruleRecord, "TriggerType", "triggerType")),
        triggerPeriod: toOptionalNumber(read(ruleRecord, "TriggerYearPeriod", "triggerYearPeriod", "TriggerPeriod", "triggerPeriod")),
        bonusRateType: mapRateType(read(ruleRecord, "BonusRateType", "bonusRateType")),
        bonusValue: toNumber(read(ruleRecord, "BonusValue", "bonusValue")),
        calculationBasis: formatReferenceLabel(read(ruleRecord, "CalculationBasis", "calculationBasis")),
        payoutTiming: formatReferenceLabel(read(ruleRecord, "PayoutTiming", "payoutTiming"))
      };
    }),
    commissionConfig: {
      ...base.commissionConfig,
      enabled: toBoolean(read(step7, "Enabled", "enabled")),
      method: mapCommissionMethod(read(step7, "Method", "method")),
      oneOff: {
        tiers: toArray(read(commissionConfig, "Tiers", "tiers")).map((tier, index) => mapCommissionTier(tier, `${details.ProductCode || "COMM"}-${index}`))
      }
    },
    commissionRules: {
      calculationBasis: "Gross Placement Amount",
      rankDetermination: "Rank at Completed"
    },
    hasComplimentaryBenefits: toBoolean(read(step9, "HasComplimentaryBenefits", "hasComplimentaryBenefits")),
    benefits: toArray(read(step9, "Benefits", "benefits")).map((benefit, index) => {
      const benefitRecord = asRecord(benefit);
      const benefitMaximum = toOptionalNumber(read(benefitRecord, "MaximumPlacement", "maximumPlacement"));
      return {
        id: `${details.ProductCode || "BENEFIT"}-${index}`,
        minimumPlacement: toNumber(read(benefitRecord, "MinimumPlacement", "minimumPlacement")),
        maximumPlacement: benefitMaximum,
        noMaximum: benefitMaximum === undefined,
        benefitName: toStringValue(read(benefitRecord, "BenefitName", "benefitName")),
        benefitValue: toNumber(read(benefitRecord, "BenefitValue", "benefitValue")),
        fulfilmentMethod: formatReferenceLabel(read(benefitRecord, "FulfilmentMethod", "fulfilmentMethod"))
      };
    }),
    updatedAt: new Date().toISOString()
  };
}

function mapCommissionTier(value: unknown, id: string): CommissionTier {
  const tier = asRecord(value);
  return {
    id,
    rank: toStringValue(read(tier, "Rank", "rank")),
    commissionType: toReferenceCode(toStringValue(read(tier, "CommissionType", "commissionType"))) === "OVERRIDING" ? "OVERRIDING" : "PERSONAL",
    rate: toNumber(read(tier, "Rate", "rate"))
  };
}

function read(record: Record<string, unknown>, ...keys: string[]) {
  return keys.map((key) => record[key]).find((value) => value !== undefined && value !== null);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toStringArray(value: unknown) {
  return Array.isArray(value) ? value.map(toStringValue).filter(Boolean) : [];
}

function toStringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : value === undefined || value === null ? "" : String(value);
}

function toNumber(value: unknown) {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function toOptionalNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function toBoolean(value: unknown) {
  return value === true || String(value).toLowerCase() === "true";
}

function toYearlyRates(value: unknown) {
  const record = asRecord(value);
  return Object.fromEntries(Object.entries(record).map(([year, rate]) => [Number(year), toNumber(rate)]));
}

function mapStatus(value: unknown): TrustPlan["basicInfo"]["productStatus"] {
  const normalized = toReferenceCode(toStringValue(value));
  if (normalized === "ACTIVE") return "Active";
  if (normalized === "INACTIVE") return "Inactive";
  return "Draft";
}

function mapPeriodUnit(value: unknown): "Months" | "Years" {
  return toReferenceCode(toStringValue(value)).startsWith("MONTH") ? "Months" : "Years";
}

function mapPaymentFrequency(value: unknown): TrustPlan["paymentConfig"]["paymentFrequency"] {
  const label = formatReferenceLabel(value);
  if (label === "One Time" || label === "One Off") return "One-Off";
  if (["Monthly", "Quarterly", "Half Yearly", "Yearly"].includes(label)) return label === "Half Yearly" ? "Half-Yearly" : label as TrustPlan["paymentConfig"]["paymentFrequency"];
  return "";
}

function mapPayoutFrequency(value: unknown): TrustPlan["payoutConfig"]["payoutFrequency"] {
  const label = formatReferenceLabel(value);
  if (["Monthly", "Quarterly", "Half Yearly", "Yearly"].includes(label)) return label === "Half Yearly" ? "Half-Yearly" : label as TrustPlan["payoutConfig"]["payoutFrequency"];
  return "";
}

function mapReturnMethod(value: unknown): TrustPlan["returnConfig"]["method"] {
  const normalized = toReferenceCode(toStringValue(value));
  if (normalized === "INVESTMENT_PERIOD_TIER_RATE") return "Investment + Period Tier Rate";
  return "Investment + Period Tier Rate";
}

function mapCommissionMethod(value: unknown): TrustPlan["commissionConfig"]["method"] {
  const normalized = toReferenceCode(toStringValue(value));
  if (normalized === "ONE_OFF_COMMISSION") return "One-Off Commission";
  return "One-Off Commission";
}

function mapRateType(value: unknown): "Percentage" | "Fixed Amount" {
  return toReferenceCode(toStringValue(value)) === "FIXED_AMOUNT" ? "Fixed Amount" : "Percentage";
}

function formatReferenceLabel(value: unknown) {
  const text = toStringValue(value);
  if (!text) return "";
  return text.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function toReferenceCode(value: string) {
  return value.trim().replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "").toUpperCase();
}
