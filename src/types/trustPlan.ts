export type TrustPlanStatus = "Draft" | "Active" | "Inactive";
export type ReturnMethod =
  | "Fixed Rate"
  | "Investment Tier Rate"
  | "Period / Year Tiered Rate"
  | "Investment + Period Tier Rate"
  | "Fixed Rate + Bonus"
  | "Redeposit / Accumulated Return";
export type CommissionMethod =
  | "One-Off Commission"
  | "Monthly Recurring Commission"
  | "Yearly Commission"
  | "Multi-Year Tiered Commission"
  | "Hybrid Commission";
export type TrustExecutionRank = "STR" | "TR" | "TM" | "TD" | "GTD" | "CTD";

export interface TrustPlan {
  id: string;
  basicInfo: {
    productCode: string;
    productName: string;
    productCategory: string;
    productDescription: string;
    minimumPlacement: number;
    maximumPlacement?: number;
    noMaximum: boolean;
    fundManagementPeriod: number;
    fundManagementPeriodUnit: "Months" | "Years";
    effectiveDate: string;
    endDate?: string;
    noEndDate: boolean;
    productStatus: TrustPlanStatus;
    allowNewSubscription: boolean;
    executionRanks: TrustExecutionRank[];
  };
  paymentConfig: {
    paymentFrequency: "One-Off" | "Monthly" | "Quarterly" | "Half-Yearly" | "Yearly" | "";
    paymentTerm?: number;
    paymentTermUnit: "Months" | "Years";
  };
  fees: FeeRule[];
  tenureConfig: {
    lockInPeriod?: number;
    lockInPeriodUnit: "Months" | "Years";
    allowEarlyWithdrawal: boolean;
    earlyWithdrawalFeeType: "Percentage" | "Fixed Amount";
    earlyWithdrawalFeeValue?: number;
    allowRedeposit: boolean;
  };
  returnConfig: {
    method: ReturnMethod | "";
    fixedRate: {
      annualRate?: number;
      calculationBasis: string;
      allowRedeposit: boolean;
    };
    investmentTiers: InvestmentTier[];
    periodRates: PeriodRate[];
    matrixTiers: MatrixTier[];
    fixedBonus: {
      baseAnnualRate?: number;
    };
    redeposit: {
      baseAnnualRate?: number;
      calculationBasis: string;
      generatesAdditionalReturn: boolean;
      additionalReturnRate?: number;
      additionalReturnPeriod?: number;
    };
  };
  payoutConfig: {
    payoutFrequency: "Monthly" | "Quarterly" | "Half-Yearly" | "Yearly" | "At Maturity" | "";
    calculationStart: "From Commencement Date" | "";
    allowDividendRedeposit: boolean;
  };
  hasBonusReturn: boolean;
  bonusRules: BonusRule[];
  commissionConfig: {
    enabled: boolean;
    method: CommissionMethod | "";
    oneOff: {
      tiers: CommissionTier[];
    };
    monthly: {
      startMonth?: number;
      endMonth?: number;
      tiers: CommissionTier[];
    };
    yearly: {
      years: YearlyCommission[];
    };
    multiYear: {
      plans: CommissionPlan[];
    };
    hybrid: {
      phases: CommissionPhase[];
    };
  };
  commissionRules: {
    calculationBasis: "Gross Placement Amount" | "Net Amount After Fees" | "";
    rankDetermination: "Rank at Submission" | "Rank at Completed" | "Rank at Payout" | "";
  };
  hasComplimentaryBenefits: boolean;
  benefits: BenefitTier[];
  requirements: RequirementRule[];
  updatedAt: string;
}

export interface FeeRule {
  id: string;
  feeType: string;
  rateType: "Percentage" | "Fixed Amount";
  value: number;
  chargeTiming: string;
}

export interface InvestmentTier {
  id: string;
  minimumAmount: number;
  maximumAmount?: number;
  noMaximum: boolean;
  annualRate: number;
}

export interface PeriodRate {
  id: string;
  fromPeriod: number;
  toPeriod: number;
  returnRate: number;
}

export interface MatrixTier {
  id: string;
  minimumPlacement: number;
  maximumPlacement?: number;
  noMaximum: boolean;
  yearlyRates: Record<number, number>;
}

export interface BonusRule {
  id: string;
  bonusName: string;
  triggerType: string;
  triggerPeriod?: number;
  bonusRateType: "Percentage" | "Fixed Amount";
  bonusValue: number;
  calculationBasis: string;
  payoutTiming: string;
}

export interface CommissionTier {
  id: string;
  rank: string;
  commissionType: "Personal" | "Overriding";
  rate: number;
}

export interface YearlyCommission {
  id: string;
  year: number;
  tiers: CommissionTier[];
}

export interface CommissionPlan {
  id: string;
  label: string;
  years: YearlyCommission[];
}

export interface CommissionPhase {
  id: string;
  fromYear: number;
  toYear: number;
  commissionMethod: string;
  tiers: CommissionTier[];
}

export interface BenefitTier {
  id: string;
  minimumPlacement: number;
  maximumPlacement?: number;
  noMaximum: boolean;
  benefitName: string;
  benefitValue: number;
  fulfilmentMethod: string;
}

export interface RequirementRule {
  id: string;
  requirementName: string;
  requirementType: string;
  mandatory: boolean;
}
