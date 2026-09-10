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
export type EditableNumber = number | undefined;

export interface TrustPlan {
  id: string;
  basicInfo: {
    productCode: string;
    productName: string;
    productCategory: string;
    productDescription: string;
    minimumPlacement: EditableNumber;
    maximumPlacement?: EditableNumber;
    noMaximum: boolean;
    fundManagementPeriod: EditableNumber;
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
    paymentTerm?: EditableNumber;
    paymentTermUnit: "Months" | "Years";
  };
  fees: FeeRule[];
  tenureConfig: {
    lockInPeriod?: EditableNumber;
    lockInPeriodUnit: "Months" | "Years";
    allowEarlyWithdrawal: boolean;
    earlyWithdrawalFeeType: "Percentage" | "Fixed Amount";
    earlyWithdrawalFeeValue?: EditableNumber;
  };
  returnConfig: {
    method: ReturnMethod | "";
    fixedRate: {
      annualRate?: EditableNumber;
      calculationBasis: string;
    };
    investmentTiers: InvestmentTier[];
    periodRates: PeriodRate[];
    matrixTiers: MatrixTier[];
    fixedBonus: {
      baseAnnualRate?: EditableNumber;
    };
    redeposit: {
      baseAnnualRate?: EditableNumber;
      calculationBasis: string;
      generatesAdditionalReturn: boolean;
      additionalReturnRate?: EditableNumber;
      additionalReturnPeriod?: EditableNumber;
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
    calculationBasis: "Gross Placement Amount" | "";
    rankDetermination: "Rank at Completed" | "";
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
  value: EditableNumber;
  chargeTiming: string;
}

export interface InvestmentTier {
  id: string;
  minimumAmount: EditableNumber;
  maximumAmount?: EditableNumber;
  noMaximum: boolean;
  annualRate: EditableNumber;
}

export interface PeriodRate {
  id: string;
  fromPeriod: EditableNumber;
  toPeriod: EditableNumber;
  returnRate: EditableNumber;
}

export interface MatrixTier {
  id: string;
  minimumPlacement: EditableNumber;
  maximumPlacement?: EditableNumber;
  noMaximum: boolean;
  yearlyRates: Record<number, EditableNumber>;
}

export interface BonusRule {
  id: string;
  bonusName: string;
  triggerType: string;
  triggerPeriod?: number;
  bonusRateType: "Percentage" | "Fixed Amount";
  bonusValue: EditableNumber;
  calculationBasis: string;
  payoutTiming: string;
}

export interface CommissionTier {
  id: string;
  rank: string;
  commissionType: "PERSONAL" | "OVERRIDING";
  rate: EditableNumber;
}

export interface YearlyCommission {
  id: string;
  year: EditableNumber;
  tiers: CommissionTier[];
}

export interface CommissionPlan {
  id: string;
  label: string;
  years: YearlyCommission[];
}

export interface CommissionPhase {
  id: string;
  fromYear: EditableNumber;
  toYear: EditableNumber;
  commissionMethod: string;
  tiers: CommissionTier[];
}

export interface BenefitTier {
  id: string;
  minimumPlacement: EditableNumber;
  maximumPlacement?: EditableNumber;
  noMaximum: boolean;
  benefitName: string;
  benefitValue: EditableNumber;
  fulfilmentMethod: string;
}

export interface RequirementRule {
  id: string;
  requirementName: string;
  requirementType: string;
  mandatory: boolean;
}

export type TrustPlanFormState = TrustPlan;

export interface TrustPlanRequestDto {
  generatedAt: string;
  trustPlanId?: string;
  steps: {
    step1BasicInformation: {
      productName: string;
      productCategory: string;
      productDescription: string;
      minimumPlacement: number;
      maximumPlacement: number | null;
      fundManagementPeriod: number;
      fundManagementPeriodUnit: string;
      productStatus: string;
      executionRanks: TrustExecutionRank[];
    };
    step2PaymentAndFees: {
      paymentConfig: {
        paymentFrequency: string;
      };
      fees: Array<{
        feeType: string;
        rateType: string;
        value: number;
        chargeTiming: string;
      }>;
    };
    step3TenureAndWithdrawal: {
      lockInPeriod?: number;
      lockInPeriodUnit: string;
      allowEarlyWithdrawal: boolean;
      earlyWithdrawalFeeType?: string;
      earlyWithdrawalFeeValue?: number;
    };
    step4DividendReturn: {
      method: string;
      matrixTiers: Array<{
        minimumPlacement: number;
        maximumPlacement: number | null;
        yearlyRates: Record<string, number>;
      }>;
    };
    step5DividendPayout: {
      payoutFrequency: string;
      calculationStart: string;
      allowDividendRedeposit: boolean;
    };
    step6BonusConfiguration: {
      hasBonusReturn: boolean;
    } & (
      | { hasBonusReturn: false }
      | {
          hasBonusReturn: true;
          bonusRules: Array<{
            bonusName: string;
            triggerType: string;
            triggerPeriod?: number;
            bonusRateType: string;
            bonusValue: number;
            calculationBasis: string;
            payoutTiming: string;
          }>;
        }
    );
    step7CommissionConfiguration: {
      enabled: boolean;
      method?: string;
      oneOff?: {
        tiers: Array<{
          rank: string;
          commissionType: CommissionTier["commissionType"];
          rate: number;
        }>;
      };
    };
    step8CommissionRules: {
      calculationBasis: string;
      rankDetermination: string;
    };
    step9ComplimentaryBenefits: {
      hasComplimentaryBenefits: boolean;
      benefits?: Array<{
        minimumPlacement: number;
        maximumPlacement: number | null;
        benefitName: string;
        benefitValue: number;
        fulfilmentMethod: string;
      }>;
    };
  };
}
