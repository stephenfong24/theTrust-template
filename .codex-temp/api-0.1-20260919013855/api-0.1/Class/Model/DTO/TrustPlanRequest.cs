using System;
using System.Collections.Generic;

namespace API_CPX.Class.Model.TrustPlan
{
    public class TrustPlanRequest
    {
        public DateTime? GeneratedAt { get; set; }

        // Frontend metadata only.
        // Do not persist as ProductCode.
        public TrustPlanSteps Steps { get; set; }
    }

    public class TrustPlanSteps
    {
        public Step1BasicInformation Step1BasicInformation { get; set; }
        public Step2PaymentAndFees Step2PaymentAndFees { get; set; }
        public Step3TenureAndWithdrawal Step3TenureAndWithdrawal { get; set; }
        public Step4DividendReturn Step4DividendReturn { get; set; }
        public Step5DividendPayout Step5DividendPayout { get; set; }
        public Step6BonusConfiguration Step6BonusConfiguration { get; set; }
        public Step7CommissionConfiguration Step7CommissionConfiguration { get; set; }
        public Step8CommissionRules Step8CommissionRules { get; set; }
        public Step9ComplimentaryBenefits Step9ComplimentaryBenefits { get; set; }
    }

    public class Step1BasicInformation
    {
        public string ProductName { get; set; }
        public string ProductCategory { get; set; }
        public string ProductDescription { get; set; }
        public decimal MinimumPlacement { get; set; }
        public decimal? MaximumPlacement { get; set; }
        public int FundManagementPeriod { get; set; }
        public string FundManagementPeriodUnit { get; set; }
        public string ProductStatus { get; set; }
        public List<string> ExecutionRanks { get; set; }
    }

    public class Step2PaymentAndFees
    {
        public PaymentConfig PaymentConfig { get; set; }
        public List<TrustPlanFeeRequest> Fees { get; set; }
    }

    public class PaymentConfig
    {
        public string PaymentFrequency { get; set; }
    }

    public class TrustPlanFeeRequest
    {
        public string FeeType { get; set; }
        public string RateType { get; set; }
        public decimal Value { get; set; }
        public string ChargeTiming { get; set; }
    }

    public class Step3TenureAndWithdrawal
    {
        public int LockInPeriod { get; set; }
        public string LockInPeriodUnit { get; set; }
        public bool AllowEarlyWithdrawal { get; set; }
        public string EarlyWithdrawalFeeType { get; set; }
        public decimal? EarlyWithdrawalFeeValue { get; set; }
    }

    public class Step4DividendReturn
    {
        public string Method { get; set; }

        public List<DividendInvestmentPeriodTierRequest> MatrixTiers
        {
            get;
            set;
        }
    }

    public class DividendInvestmentPeriodTierRequest
    {
        public decimal MinimumPlacement { get; set; }
        public decimal? MaximumPlacement { get; set; }
        public Dictionary<string, decimal> YearlyRates { get; set; }
    }

    public class Step5DividendPayout
    {
        public string PayoutFrequency { get; set; }
        public string CalculationStart { get; set; }
        public bool AllowDividendRedeposit { get; set; }
    }

    public class Step6BonusConfiguration
    {
        public bool HasBonusReturn { get; set; }
        public List<BonusRuleRequest> BonusRules { get; set; }
    }

    public class BonusRuleRequest
    {
        public string BonusName { get; set; }
        public string TriggerType { get; set; }
        public int? TriggerYearPeriod { get; set; }
        public string BonusRateType { get; set; }
        public decimal BonusValue { get; set; }
        public string CalculationBasis { get; set; }
        public string PayoutTiming { get; set; }
    }

    public class Step7CommissionConfiguration
    {
        public bool Enabled { get; set; }
        public string Method { get; set; }
        public OneOffCommissionRequest OneOff { get; set; }
    }

    public class OneOffCommissionRequest
    {
        public List<OneOffCommissionTierRequest> Tiers { get; set; }
    }

    public class OneOffCommissionTierRequest
    {
        public string Rank { get; set; }
        public string CommissionType { get; set; }
        public decimal Rate { get; set; }
    }

    public class Step8CommissionRules
    {
        public string CalculationBasis { get; set; }
        public string RankDetermination { get; set; }
    }

    public class Step9ComplimentaryBenefits
    {
        public bool HasComplimentaryBenefits { get; set; }
        public List<ComplimentaryBenefitRequest> Benefits { get; set; }
    }

    public class ComplimentaryBenefitRequest
    {
        public decimal MinimumPlacement { get; set; }
        public decimal? MaximumPlacement { get; set; }
        public string BenefitName { get; set; }
        public decimal? BenefitValue { get; set; }
        public string FulfilmentMethod { get; set; }
    }
}