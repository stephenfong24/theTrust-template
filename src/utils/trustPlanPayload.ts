import type { BenefitTier, CommissionTier, FeeRule, MatrixTier, TrustPlan, TrustPlanRequestDto } from "../types/trustPlan";

const staticFeeTypes = ["Setup Fee", "Admin Fee", "Processing Fee"] as const;

export function buildTrustPlanPayload(plan: TrustPlan): TrustPlanRequestDto {
  return {
    generatedAt: new Date().toISOString(),
    trustPlanId: plan.id,
    steps: {
      step1BasicInformation: {
        productName: plan.basicInfo.productName,
        productCategory: toReferenceCode(plan.basicInfo.productCategory),
        productDescription: plan.basicInfo.productDescription,
        minimumPlacement: toPayloadNumber(plan.basicInfo.minimumPlacement),
        maximumPlacement: getNullableMaximum(plan.basicInfo.noMaximum, plan.basicInfo.maximumPlacement),
        fundManagementPeriod: toPayloadNumber(plan.basicInfo.fundManagementPeriod),
        fundManagementPeriodUnit: toReferenceCode(plan.basicInfo.fundManagementPeriodUnit),
        productStatus: toReferenceCode(plan.basicInfo.productStatus),
        executionRanks: plan.basicInfo.executionRanks
      },
      step2PaymentAndFees: {
        paymentConfig: {
          paymentFrequency: toReferenceCode(plan.paymentConfig.paymentFrequency)
        },
        fees: createStaticFeeRules(plan.fees).map(toFeePayload)
      },
      step3TenureAndWithdrawal: createTenurePayload(plan),
      step4DividendReturn: {
        method: "INVESTMENT_PERIOD_TIER_RATE",
        matrixTiers: plan.returnConfig.matrixTiers.map(toMatrixTierPayload)
      },
      step5DividendPayout: {
        payoutFrequency: toReferenceCode(plan.payoutConfig.payoutFrequency),
        calculationStart: toReferenceCode(plan.payoutConfig.calculationStart),
        allowDividendRedeposit: plan.payoutConfig.allowDividendRedeposit
      },
      step6BonusConfiguration: createBonusPayload(plan),
      step7CommissionConfiguration: createCommissionPayload(plan),
      step8CommissionRules: {
        calculationBasis: "GROSS_PLACEMENT_AMOUNT",
        rankDetermination: "RANK_AT_COMPLETED"
      },
      step9ComplimentaryBenefits: createBenefitsPayload(plan)
    }
  };
}

export function getNullableMaximum(noMaximum: boolean, maximumPlacement?: number): number | null {
  return noMaximum ? null : maximumPlacement ?? null;
}

export function createStaticFeeRules(fees: FeeRule[] = []): FeeRule[] {
  return staticFeeTypes.map((feeType) => {
    const existing = fees.find((fee) => fee.feeType === feeType);
    return existing ?? { id: `FEE-${toReferenceCode(feeType)}`, feeType, rateType: "Percentage", value: 0, chargeTiming: "Upon Creation" };
  });
}

function createTenurePayload(plan: TrustPlan): TrustPlanRequestDto["steps"]["step3TenureAndWithdrawal"] {
  return {
    lockInPeriod: plan.tenureConfig.lockInPeriod,
    lockInPeriodUnit: toReferenceCode(plan.tenureConfig.lockInPeriodUnit),
    allowEarlyWithdrawal: plan.tenureConfig.allowEarlyWithdrawal,
    ...(plan.tenureConfig.allowEarlyWithdrawal
      ? {
          earlyWithdrawalFeeType: toReferenceCode(plan.tenureConfig.earlyWithdrawalFeeType),
          earlyWithdrawalFeeValue: plan.tenureConfig.earlyWithdrawalFeeValue
        }
      : {})
  };
}

function createBonusPayload(plan: TrustPlan): TrustPlanRequestDto["steps"]["step6BonusConfiguration"] {
  if (!plan.hasBonusReturn) return { hasBonusReturn: false };
  return {
    hasBonusReturn: true,
    bonusRules: plan.bonusRules.map(({ id: _id, ...rule }) => ({
      ...rule,
      triggerType: toReferenceCode(rule.triggerType),
      bonusRateType: toReferenceCode(rule.bonusRateType),
      bonusValue: toPayloadNumber(rule.bonusValue),
      calculationBasis: toReferenceCode(rule.calculationBasis),
      payoutTiming: toReferenceCode(rule.payoutTiming)
    }))
  };
}

function createCommissionPayload(plan: TrustPlan): TrustPlanRequestDto["steps"]["step7CommissionConfiguration"] {
  if (!plan.commissionConfig.enabled) return { enabled: false };
  return {
    enabled: true,
    method: "ONE_OFF_COMMISSION",
    oneOff: {
      tiers: plan.commissionConfig.oneOff.tiers.map(toCommissionTierPayload)
    }
  };
}

function createBenefitsPayload(plan: TrustPlan): TrustPlanRequestDto["steps"]["step9ComplimentaryBenefits"] {
  if (!plan.hasComplimentaryBenefits) return { hasComplimentaryBenefits: false };
  return {
    hasComplimentaryBenefits: true,
    benefits: plan.benefits.map(toBenefitPayload)
  };
}

function toFeePayload(fee: FeeRule) {
  return {
    feeType: toReferenceCode(fee.feeType),
    rateType: toReferenceCode(fee.rateType),
    value: toPayloadNumber(fee.value),
    chargeTiming: toReferenceCode(fee.chargeTiming)
  };
}

function toMatrixTierPayload(tier: MatrixTier) {
  return {
    minimumPlacement: toPayloadNumber(tier.minimumPlacement),
    maximumPlacement: getNullableMaximum(tier.noMaximum, tier.maximumPlacement),
    yearlyRates: Object.fromEntries(Object.entries(tier.yearlyRates).map(([year, rate]) => [String(year), Number(rate || 0)]))
  };
}

function toCommissionTierPayload(tier: CommissionTier) {
  return {
    rank: tier.rank,
    commissionType: tier.commissionType,
    rate: toPayloadNumber(tier.rate)
  };
}

function toBenefitPayload(benefit: BenefitTier) {
  return {
    minimumPlacement: toPayloadNumber(benefit.minimumPlacement),
    maximumPlacement: getNullableMaximum(benefit.noMaximum, benefit.maximumPlacement),
    benefitName: benefit.benefitName,
    benefitValue: toPayloadNumber(benefit.benefitValue),
    fulfilmentMethod: toReferenceCode(benefit.fulfilmentMethod)
  };
}

function toPayloadNumber(value: number | undefined): number {
  return Number(value ?? 0);
}

function toReferenceCode(value: string) {
  return value.trim().replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "").toUpperCase();
}
