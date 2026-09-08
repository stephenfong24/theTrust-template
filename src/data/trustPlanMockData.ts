import type { TrustPlan } from "../types/trustPlan";

export const trustPlanStorageKey = "theTrust.trustPlans";
const staticFeeTypes = ["Setup Fee", "Admin Fee", "Processing Fee"] as const;

export const trustPlanMockData: TrustPlan[] = [
  createTrustPlan({
    id: "TP-MYTRUST",
    code: "MYTRUST",
    name: "MyTrust",
    category: "Trust",
    min: 10000,
    years: 2,
    returnMethod: "Investment + Period Tier Rate",
    payoutFrequency: "Yearly",
    commissionMethod: "One-Off Commission",
    effectiveDate: "2026-01-01",
    status: "Active",
    matrixTiers: [
      { minimumPlacement: 10000, maximumPlacement: 99999.99, noMaximum: false, yearlyRates: { 1: 8, 2: 8 } },
      { minimumPlacement: 100000, maximumPlacement: 249999.99, noMaximum: false, yearlyRates: { 1: 8, 2: 9 } },
      { minimumPlacement: 250000, maximumPlacement: 499999.99, noMaximum: false, yearlyRates: { 1: 8, 2: 9.5 } },
      { minimumPlacement: 500000, maximumPlacement: 999999.99, noMaximum: false, yearlyRates: { 1: 8, 2: 10 } },
      { minimumPlacement: 1000000, noMaximum: true, yearlyRates: { 1: 9, 2: 11 } }
    ]
  }),
  createTrustPlan({
    id: "TP-SECURE",
    code: "SECURE",
    name: "Secure Trust",
    category: "Trust",
    min: 50000,
    years: 5,
    returnMethod: "Fixed Rate",
    payoutFrequency: "Quarterly",
    commissionMethod: "One-Off Commission",
    effectiveDate: "2026-02-01",
    status: "Active"
  }),
  createTrustPlan({
    id: "TP-SAVING",
    code: "SAVING",
    name: "Saving Trust",
    category: "Saving Trust",
    min: 300,
    years: 10,
    returnMethod: "Period / Year Tiered Rate",
    payoutFrequency: "At Maturity",
    commissionMethod: "Multi-Year Tiered Commission",
    effectiveDate: "2026-03-15",
    status: "Draft"
  }),
  createTrustPlan({
    id: "TP-FLEXI",
    code: "FLEXI",
    name: "Secure Flexi",
    category: "Flexi Trust",
    min: 1000,
    years: 3,
    returnMethod: "Investment Tier Rate",
    payoutFrequency: "Monthly",
    commissionMethod: "Monthly Recurring Commission",
    effectiveDate: "2026-04-01",
    status: "Inactive"
  }),
  createTrustPlan({
    id: "TP-FLEXIPLUS",
    code: "FLEXIPLUS",
    name: "Flexi+",
    category: "Flexi Trust",
    min: 5000,
    years: 5,
    returnMethod: "Fixed Rate + Bonus",
    payoutFrequency: "Half-Yearly",
    commissionMethod: "Hybrid Commission",
    effectiveDate: "2026-05-01",
    status: "Draft",
    hybridPhases: [
      {
        id: "TP-FLEXIPLUS-PHASE-1",
        fromYear: 1,
        toYear: 1,
        commissionMethod: "One-Off Commission",
        tiers: [
          { id: "TP-FLEXIPLUS-P1-TR", rank: "TR", commissionType: "Personal", rate: 3 },
          { id: "TP-FLEXIPLUS-P1-TM", rank: "TM", commissionType: "Overriding", rate: 0.36 },
          { id: "TP-FLEXIPLUS-P1-TD", rank: "TD", commissionType: "Overriding", rate: 0.24 },
          { id: "TP-FLEXIPLUS-P1-GTD", rank: "GTD", commissionType: "Overriding", rate: 0.12 },
          { id: "TP-FLEXIPLUS-P1-CTD", rank: "CTD", commissionType: "Overriding", rate: 0.06 }
        ]
      },
      {
        id: "TP-FLEXIPLUS-PHASE-2",
        fromYear: 2,
        toYear: 3,
        commissionMethod: "Monthly Recurring Commission",
        tiers: [
          { id: "TP-FLEXIPLUS-P2-TR", rank: "TR", commissionType: "Personal", rate: 0.25 },
          { id: "TP-FLEXIPLUS-P2-TM", rank: "TM", commissionType: "Overriding", rate: 0.03 },
          { id: "TP-FLEXIPLUS-P2-TD", rank: "TD", commissionType: "Overriding", rate: 0.02 },
          { id: "TP-FLEXIPLUS-P2-GTD", rank: "GTD", commissionType: "Overriding", rate: 0.01 },
          { id: "TP-FLEXIPLUS-P2-CTD", rank: "CTD", commissionType: "Overriding", rate: 0.005 }
        ]
      }
    ]
  })
];

export function createEmptyTrustPlan(): TrustPlan {
  return createTrustPlan({
    id: `TP-${Date.now()}`,
    code: "",
    name: "",
    category: "",
    min: 0,
    years: 2,
    returnMethod: "Investment + Period Tier Rate",
    payoutFrequency: "",
    commissionMethod: "One-Off Commission",
    effectiveDate: "",
    status: "Draft"
  });
}

function createTrustPlan(input: {
  id: string;
  code: string;
  name: string;
  category: string;
  min: number;
  years: number;
  returnMethod: TrustPlan["returnConfig"]["method"];
  payoutFrequency: TrustPlan["payoutConfig"]["payoutFrequency"];
  commissionMethod: TrustPlan["commissionConfig"]["method"];
  effectiveDate: string;
  status: TrustPlan["basicInfo"]["productStatus"];
  matrixTiers?: Omit<TrustPlan["returnConfig"]["matrixTiers"][number], "id">[];
  hybridPhases?: TrustPlan["commissionConfig"]["hybrid"]["phases"];
}): TrustPlan {
  return {
    id: input.id,
    basicInfo: {
      productCode: input.code,
      productName: input.name,
      productCategory: input.category,
      productDescription: "",
      minimumPlacement: input.min,
      noMaximum: true,
      fundManagementPeriod: input.years,
      fundManagementPeriodUnit: "Years",
      effectiveDate: input.effectiveDate,
      noEndDate: true,
      productStatus: input.status,
      allowNewSubscription: input.status === "Active",
      executionRanks: ["STR", "TR", "TM", "TD", "GTD", "CTD"]
    },
    paymentConfig: {
      paymentFrequency: "One-Off",
      paymentTermUnit: "Years"
    },
    fees: createStaticFeeRules(input.id),
    tenureConfig: {
      lockInPeriodUnit: "Years",
      allowEarlyWithdrawal: false,
      earlyWithdrawalFeeType: "Percentage",
      allowRedeposit: false
    },
    returnConfig: {
      method: input.returnMethod,
      fixedRate: { annualRate: input.returnMethod === "Fixed Rate" ? 8 : undefined, calculationBasis: "Original Investment Amount", allowRedeposit: false },
      investmentTiers: [],
      periodRates: [],
      matrixTiers: (input.matrixTiers ?? []).map((tier, index) => ({ ...tier, id: `${input.id}-MATRIX-${index}` })),
      fixedBonus: { baseAnnualRate: input.returnMethod === "Fixed Rate + Bonus" ? 7 : undefined },
      redeposit: { calculationBasis: "Dividend Amount", generatesAdditionalReturn: false }
    },
    payoutConfig: {
      payoutFrequency: input.payoutFrequency,
      calculationStart: "From Commencement Date",
      allowDividendRedeposit: false
    },
    hasBonusReturn: input.returnMethod === "Fixed Rate + Bonus",
    bonusRules: [],
    commissionConfig: {
      enabled: true,
      method: input.commissionMethod,
      oneOff: {
        tiers: [
          { id: `${input.id}-TR`, rank: "TR", commissionType: "Personal", rate: 5 },
          { id: `${input.id}-TM`, rank: "TM", commissionType: "Overriding", rate: 0.3 }
        ]
      },
      monthly: { tiers: [] },
      yearly: { years: [] },
      multiYear: { plans: [] },
      hybrid: { phases: input.hybridPhases ?? [] }
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

function createStaticFeeRules(planId: string): TrustPlan["fees"] {
  return staticFeeTypes.map((feeType) => ({
    id: `${planId}-${feeType.replace(/\s+/g, "-").toUpperCase()}`,
    feeType,
    rateType: "Percentage",
    value: 0,
    chargeTiming: "Upon Creation"
  }));
}
