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
  };
  paymentConfig: {
    collectionMethod: "Upfront" | "Monthly" | "Scheduled" | "";
    minimumPayment?: number;
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
    calculationStart: "From Commencement Date" | "From Effective Date" | "Fixed Schedule" | "";
    payoutTiming: "On Return Date" | "X Days After Return Date" | "Fixed Calendar Date" | "";
    daysAfterReturn?: number;
    fixedCalendarDay?: number;
    allowDividendRedeposit: boolean;
  };
  hasBonusReturn: boolean;
  bonusRules: BonusRule[];
  commissionConfig: {
    enabled: boolean;
    method: CommissionMethod | "";
    oneOff: {
      timing: string;
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
    calculationBasis: "Gross Placement Amount" | "Collected Amount" | "Net Amount After Fees" | "";
    networkSource: "Trust Network" | "Will Network" | "Based on Transaction Reference" | "";
    rankDetermination: "Rank at Submission" | "Rank at Approval" | "Rank at Payout" | "";
    allowOverriding: boolean;
    maximumCommissionLevel?: number;
    startTrigger: "Trust Created" | "Trust Approved" | "Payment Received" | "";
    commissionPeriod?: number;
    commissionPeriodUnit: "Months" | "Years";
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
