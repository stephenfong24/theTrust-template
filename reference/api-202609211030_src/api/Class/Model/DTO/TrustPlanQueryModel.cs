using System.Collections.Generic;

namespace API_CPX.Class.Model.TrustPlan
{
    // ================================================================
    // Trust Product List Request
    // ================================================================

    public class TrustPlanListRequest
    {
        public string Search { get; set; }
        public string ProductCategory { get; set; }
        public string Status { get; set; }
        public string ReturnMethod { get; set; }
        public string CommissionMethod { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }

    // ================================================================
    // Trust Product List Response
    // ================================================================

    public class TrustPlanListResponse
    {
        public int TotalRecords { get; set; }
        public int TotalPages { get; set; }
        public int CurrentPage { get; set; }
        public int PageSize { get; set; }
        public List<TrustPlanListItem> Records { get; set; }
    }

    public class TrustPlanListItem
    {
        public string ProductCode { get; set; }
        public string ProductName { get; set; }
        public string ProductDescription { get; set; }
        public string ProductCategory { get; set; }
        public string ProductCategoryName { get; set; }
        public decimal MinimumPlacement { get; set; }
        public int FundManagementPeriod { get; set; }
        public string FundManagementPeriodUnit { get; set; }
        public string ReturnMethod { get; set; }
        public string PayoutFrequency { get; set; }
        public string CommissionMethod { get; set; }
        public string ProductStatus { get; set; }
    }

    // ================================================================
    // Trust Product Details Response
    // ================================================================

    public class TrustPlanDetailsResponse
    {
        public string ProductCode { get; set; }
        public TrustPlanDetailsSteps Steps { get; set; }
    }

    public class TrustPlanDetailsSteps
    {
        public Step1BasicInformation Step1BasicInformation { get; set; }
        public Step2PaymentAndFees Step2PaymentAndFees { get; set; }
        public Step3TenureAndWithdrawal Step3TenureAndWithdrawal { get; set; }
        public DividendReturnDetails Step4DividendReturn { get; set; }
        public Step5DividendPayout Step5DividendPayout { get; set; }
        public Step6BonusConfiguration Step6BonusConfiguration { get; set; }
        public CommissionConfigurationDetails Step7CommissionConfiguration { get; set; }
        public Step8CommissionRules Step8CommissionRules { get; set; }
        public Step9ComplimentaryBenefits Step9ComplimentaryBenefits { get; set; }
    }

    // ================================================================
    // Step 4 - Dividend / Return
    // ================================================================

    public class DividendReturnDetails
    {
        public string Method { get; set; }

        // ============================================================
        // FUTURE EXTENSION AREA
        // ============================================================
        //
        // Different Dividend / Return methods can return a different
        // Configuration object.
        //
        // Current:
        //
        // INVESTMENT_PERIOD_TIER_RATE
        //     -> InvestmentPeriodTierRateConfiguration
        //
        //
        // Future examples:
        //
        // FIXED_RATE
        //     -> FixedRateConfiguration
        //
        // INVESTMENT_TIER_RATE
        //     -> InvestmentTierRateConfiguration
        //
        // PERIOD_TIER_RATE
        //     -> PeriodTierRateConfiguration
        //
        // FIXED_RATE_BONUS
        //     -> FixedRateBonusConfiguration
        //
        // REDEPOSIT_ACCUMULATED_RETURN
        //     -> RedepositAccumulatedReturnConfiguration
        //
        //
        // API structure will remain:
        //
        // {
        //     "Method": "...",
        //     "Configuration": { ... }
        // }
        //
        // ============================================================

        public object Configuration { get; set; }
    }

    // ================================================================
    // Current Dividend / Return Method
    // INVESTMENT_PERIOD_TIER_RATE
    // ================================================================

    public class InvestmentPeriodTierRateConfiguration
    {
        public List<DividendInvestmentPeriodTierRequest> Tiers { get; set; }
    }

    // ================================================================
    // Step 7 - Commission
    // ================================================================

    public class CommissionConfigurationDetails
    {
        public bool Enabled { get; set; }
        public string Method { get; set; }

        // ============================================================
        // FUTURE EXTENSION AREA
        // ============================================================
        //
        // Different Commission methods can return a different
        // Configuration object.
        //
        // Current:
        //
        // ONE_OFF_COMMISSION
        //     -> OneOffCommissionConfiguration
        //
        //
        // Future examples:
        //
        // MONTHLY_RECURRING_COMMISSION
        //     -> MonthlyRecurringCommissionConfiguration
        //
        // YEARLY_COMMISSION
        //     -> YearlyCommissionConfiguration
        //
        // MULTI_YEAR_TIERED_COMMISSION
        //     -> MultiYearTieredCommissionConfiguration
        //
        // HYBRID_COMMISSION
        //     -> HybridCommissionConfiguration
        //
        //
        // API structure will remain:
        //
        // {
        //     "Enabled": true,
        //     "Method": "...",
        //     "Configuration": { ... }
        // }
        //
        // ============================================================

        public object Configuration { get; set; }
    }

    // ================================================================
    // Current Commission Method
    // ONE_OFF_COMMISSION
    // ================================================================

    public class OneOffCommissionConfiguration
    {
        public List<OneOffCommissionTierRequest> Tiers { get; set; }
    }
}