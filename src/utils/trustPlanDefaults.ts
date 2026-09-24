import type { TrustPlan } from "../types/trustPlan";

const staticFeeTypes = ["Setup Fee", "Admin Fee", "Processing Fee"] as const;

export function createEmptyTrustPlan(): TrustPlan {
  const planId = `TP-${Date.now()}`;

  return {
    id: planId,
    basicInfo: {
      productCode: "",
      productName: "",
      productCategory: "",
      productDescription: "",
      minimumPlacement: 0,
      noMaximum: true,
      fundManagementPeriod: undefined,
      fundManagementPeriodUnit: "Years",
      effectiveDate: "",
      noEndDate: true,
      productStatus: "Draft",
      allowNewSubscription: false,
      executionRanks: ["STR", "TR", "TM", "TD", "GTD", "CTD"]
    },
    paymentConfig: {
      paymentFrequency: "One-Off",
      paymentTermUnit: "Years"
    },
    fees: createDefaultFeeRules(planId),
    tenureConfig: {
      lockInPeriodUnit: "Years",
      lockInPeriod: undefined,
      allowEarlyWithdrawal: false,
      earlyWithdrawalFeeType: "Percentage",
      earlyWithdrawalFeeValue: undefined
    },
    returnConfig: {
      method: "Investment + Period Tier Rate",
      fixedRate: { calculationBasis: "Original Investment Amount" },
      investmentTiers: [],
      periodRates: [],
      matrixTiers: [],
      fixedBonus: {},
      redeposit: { calculationBasis: "Dividend Amount", generatesAdditionalReturn: false }
    },
    payoutConfig: {
      payoutFrequency: "",
      calculationStart: "From Commencement Date",
      allowDividendRedeposit: false
    },
    hasBonusReturn: false,
    bonusRules: [],
    commissionConfig: {
      enabled: true,
      method: "One-Off Commission",
      oneOff: {
        tiers: []
      },
      monthly: { tiers: [] },
      yearly: { years: [] },
      multiYear: { plans: [] },
      hybrid: { phases: [] }
    },
    commissionRules: {
      calculationBasis: "Gross Placement Amount",
      rankDetermination: "Rank at Completed"
    },
    hasComplimentaryBenefits: false,
    benefits: [],
    requirements: [],
    updatedAt: new Date().toISOString()
  };
}

function createDefaultFeeRules(planId: string): TrustPlan["fees"] {
  return staticFeeTypes.map((feeType) => ({
    id: `${planId}-${feeType.replace(/\s+/g, "-").toUpperCase()}`,
    feeType,
    rateType: "Percentage",
    value: 0,
    chargeTiming: "Upon Creation"
  }));
}
