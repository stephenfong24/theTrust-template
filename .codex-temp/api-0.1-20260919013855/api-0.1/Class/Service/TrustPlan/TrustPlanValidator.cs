using API_CPX.Class;
using API_CPX.Class.Exceptions;
using API_CPX.Class.Model.TrustPlan;
using API_CPX.Context;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Services.TrustPlan
{
    public class TrustPlanValidator
    {
        private readonly Sandbox_BasedEntities dbR;

        private const string Code = "TRUST-PLAN-VALIDATION";

        private static readonly HashSet<string> AllowedStatuses =
            new HashSet<string>(
                new[]
                {
                    "DRAFT",
                    "ACTIVE",
                    "INACTIVE"
                },
                StringComparer.OrdinalIgnoreCase);

        // ============================================================
        // Constructor
        // ============================================================

        public TrustPlanValidator(Sandbox_BasedEntities dbR)
        {
            this.dbR = dbR ?? throw new ArgumentNullException(nameof(dbR));
        }

        // ============================================================
        // Main Validation
        // ============================================================

        public async Task ValidateAsync(TrustPlanRequest request, string merchantId)
        {
            if (request == null)
            {
                Throw("Request payload is required.");
            }

            if (request.Steps == null)
            {
                Throw("Trust Plan steps are required.");
            }

            if (string.IsNullOrWhiteSpace(merchantId))
            {
                Throw("Merchant ID is required.");
            }

            string isValidMerchant = await ValidationAsync.isValidMerchant(merchantId);
            if (isValidMerchant != ProjectProperties.Return_Success)
            {
                Throw(isValidMerchant);
            }

            // ========================================================
            // Step 1 - Basic Information
            // ========================================================

            await ValidateBasicInformationAsync(request.Steps.Step1BasicInformation, merchantId);

            // ========================================================
            // Step 2 - Payment & Fees
            // ========================================================

            ValidatePaymentAndFees(request.Steps.Step2PaymentAndFees);

            // ========================================================
            // Step 3 - Tenure & Withdrawal
            // ========================================================

            ValidateTenureAndWithdrawal(request.Steps.Step3TenureAndWithdrawal, request.Steps.Step1BasicInformation);

            // ========================================================
            // Step 4 - Dividend / Return
            // ========================================================

            ValidateDividendReturn(request.Steps.Step4DividendReturn, request.Steps.Step1BasicInformation);

            // ========================================================
            // Step 5 - Dividend Payout
            // ========================================================

            ValidateDividendPayout(request.Steps.Step5DividendPayout);

            // ========================================================
            // Step 6 - Bonus Configuration
            // ========================================================

            ValidateBonus(request.Steps.Step6BonusConfiguration);

            // ========================================================
            // Step 7 - Commission Configuration
            // ========================================================

            await ValidateCommissionAsync(request.Steps.Step7CommissionConfiguration, request.Steps.Step1BasicInformation, merchantId);

            // ========================================================
            // Step 8 - Commission Rules
            // ========================================================

            ValidateCommissionRules(request.Steps.Step8CommissionRules);

            // ========================================================
            // Step 9 - Complimentary Benefits
            // ========================================================

            ValidateComplimentaryBenefits(request.Steps.Step9ComplimentaryBenefits, request.Steps.Step1BasicInformation);
        }

        // ============================================================
        // Step 1 - Basic Information
        // ============================================================

        private async Task ValidateBasicInformationAsync(Step1BasicInformation data, string merchantId)
        {
            if (data == null)
            {
                Throw("Basic Information is required.");
            }

            // --------------------------------------------------------
            // Product Name
            // --------------------------------------------------------

            if (string.IsNullOrWhiteSpace(data.ProductName))
            {
                Throw("Product Name is required.");
            }

            if (data.ProductName.Trim().Length > 200)
            {
                Throw("Product Name cannot exceed 200 characters.");
            }

            // --------------------------------------------------------
            // Product Category
            // --------------------------------------------------------

            if (string.IsNullOrWhiteSpace(data.ProductCategory))
            {
                Throw("Product Category is required.");
            }

            string productCategory = data.ProductCategory.Trim();

            bool validProductCategory = await dbR.tbl_TrustCategories.AnyAsync(x => x.MerchantID == merchantId && x.CategoryID == productCategory && x.Status == 0);
            if (!validProductCategory)
            {
                Throw("Invalid Product Category: " + productCategory);
            }

            // --------------------------------------------------------
            // Minimum / Maximum Placement
            // --------------------------------------------------------

            if (data.MinimumPlacement <= 0)
            {
                Throw("Minimum Placement must be greater than zero.");
            }

            if (data.MaximumPlacement.HasValue && data.MaximumPlacement.Value < data.MinimumPlacement)
            {
                Throw("Maximum Placement cannot be less than Minimum Placement.");
            }

            // --------------------------------------------------------
            // Fund Management Period
            // --------------------------------------------------------

            if (data.FundManagementPeriod <= 0)
            {
                Throw("Fund Management Period must be greater than zero.");
            }

            if (string.IsNullOrWhiteSpace(data.FundManagementPeriodUnit))
            {
                Throw("Fund Management Period Unit is required.");
            }

            if (!IsAllowed(data.FundManagementPeriodUnit, "YEARS", "MONTHS"))
            {
                Throw("Invalid Fund Management Period Unit.");
            }

            // --------------------------------------------------------
            // Product Status
            // --------------------------------------------------------

            if (string.IsNullOrWhiteSpace(data.ProductStatus))
            {
                Throw("Product Status is required.");
            }

            if (!AllowedStatuses.Contains(data.ProductStatus.Trim()))
            {
                Throw("Invalid Product Status: " + data.ProductStatus);
            }

            // --------------------------------------------------------
            // Execution Rank
            // --------------------------------------------------------

            if (data.ExecutionRanks == null || data.ExecutionRanks.Count == 0)
            {
                Throw("At least one Execution Rank is required.");
            }

            var submittedRanks = data.ExecutionRanks.Where(x => !string.IsNullOrWhiteSpace(x)).Select(x => x.Trim()).ToList();
            if (submittedRanks.Count != data.ExecutionRanks.Count)
            {
                Throw("Execution Rank cannot be empty.");
            }

            var duplicateRanks = submittedRanks.GroupBy(x => x, StringComparer.OrdinalIgnoreCase).Where(x => x.Count() > 1).Select(x => x.Key).ToList();
            if (duplicateRanks.Any())
            {
                Throw("Duplicate Execution Rank is not allowed: " + string.Join(", ", duplicateRanks));
            }

            // --------------------------------------------------------
            // Get Valid Rank from Database
            // --------------------------------------------------------

            var validRanks = await dbR.tbl_AgentRank.Where(x => x.MerchantID == merchantId).Select(x => x.RankCode).ToListAsync();
            var invalidRanks = submittedRanks.Where(submittedRank => !validRanks.Any(validRank => string.Equals(validRank, submittedRank, StringComparison.OrdinalIgnoreCase))).ToList();
            if (invalidRanks.Any())
            {
                Throw("Invalid Execution Rank: " + string.Join(", ", invalidRanks));
            }
        }

        // ============================================================
        // Step 2 - Payment & Fees
        // ============================================================

        private void ValidatePaymentAndFees(Step2PaymentAndFees data)
        {
            if (data == null)
            {
                Throw("Payment & Fees configuration is required.");
            }

            // --------------------------------------------------------
            // Payment Configuration
            // --------------------------------------------------------

            if (data.PaymentConfig == null)
            {
                Throw("Payment configuration is required.");
            }

            if (string.IsNullOrWhiteSpace(data.PaymentConfig.PaymentFrequency))
            {
                Throw("Payment Frequency is required.");
            }

            // --------------------------------------------------------
            // Fees
            // --------------------------------------------------------

            if (data.Fees == null)
            {
                Throw("Fee configuration is required.");
            }

            string[] requiredFees =
            {
                "SETUP_FEE",
                "ADMIN_FEE",
                "PROCESSING_FEE"
            };

            foreach (string feeType in requiredFees)
            {
                int count = data.Fees.Count(x => x != null && !string.IsNullOrWhiteSpace(x.FeeType) && string.Equals(x.FeeType.Trim(), feeType, StringComparison.OrdinalIgnoreCase));
                if (count != 1)
                {
                    Throw(feeType + " must appear exactly once.");
                }
            }

            if (data.Fees.Count != requiredFees.Length)
            {
                Throw("Only Setup Fee, Admin Fee and Processing Fee are currently supported.");
            }

            foreach (var fee in data.Fees)
            {
                if (fee == null)
                {
                    Throw("Invalid Fee configuration.");
                }

                // ----------------------------------------------------
                // Fee Type
                // ----------------------------------------------------

                if (string.IsNullOrWhiteSpace(fee.FeeType))
                {
                    Throw("Fee Type is required.");
                }

                bool validFeeType = requiredFees.Any(x => string.Equals(x, fee.FeeType.Trim(), StringComparison.OrdinalIgnoreCase));
                if (!validFeeType)
                {
                    Throw("Invalid Fee Type: " + fee.FeeType);
                }

                // ----------------------------------------------------
                // Rate Type
                // ----------------------------------------------------

                if (string.IsNullOrWhiteSpace(fee.RateType))
                {
                    Throw("Fee Rate Type is required.");
                }

                if (!IsAllowed(fee.RateType, "PERCENTAGE", "FIXED"))
                {
                    Throw("Invalid Fee Rate Type.");
                }

                // ----------------------------------------------------
                // Fee Value
                // ----------------------------------------------------

                if (fee.Value < 0)
                {
                    Throw("Fee value cannot be negative.");
                }

                if (string.Equals(fee.RateType.Trim(), "PERCENTAGE", StringComparison.OrdinalIgnoreCase) && fee.Value > 100)
                {
                    Throw("Percentage fee cannot exceed 100%.");
                }

                // ----------------------------------------------------
                // Charge Timing
                // ----------------------------------------------------

                if (string.IsNullOrWhiteSpace(fee.ChargeTiming))
                {
                    Throw("Fee Charge Timing is required.");
                }

                if (!IsAllowed(
                    fee.ChargeTiming,
                    "UPON_CREATION",
                    "UPON_PAYMENT",
                    "MONTHLY",
                    "YEARLY",
                    "UPON_WITHDRAWAL",
                    "AT_MATURITY"))
                {
                    Throw("Invalid Fee Charge Timing.");
                }
            }
        }

        // ============================================================
        // Step 3 - Tenure & Withdrawal
        // ============================================================

        private void ValidateTenureAndWithdrawal(Step3TenureAndWithdrawal data, Step1BasicInformation basic)
        {
            if (data == null)
            {
                Throw("Tenure & Withdrawal configuration is required.");
            }

            if (basic == null)
            {
                Throw("Basic Information is required.");
            }

            // --------------------------------------------------------
            // Lock-In Period
            // --------------------------------------------------------

            if (data.LockInPeriod <= 0)
            {
                Throw("Lock-In Period is required.");
            }

            if (string.IsNullOrWhiteSpace(data.LockInPeriodUnit))
            {
                Throw("Lock-In Period Unit is required.");
            }

            if (!IsAllowed(data.LockInPeriodUnit, "YEARS", "MONTHS"))
            {
                Throw("Invalid Lock-In Period Unit.");
            }

            int lockInMonths = ConvertToMonths(data.LockInPeriod, data.LockInPeriodUnit);
            int fundManagementMonths = ConvertToMonths(basic.FundManagementPeriod, basic.FundManagementPeriodUnit);

            if (lockInMonths > fundManagementMonths)
            {
                Throw("Lock-In Period cannot exceed Fund Management Period.");
            }

            // --------------------------------------------------------
            // Early Withdrawal
            // --------------------------------------------------------

            if (data.AllowEarlyWithdrawal)
            {
                if (string.IsNullOrWhiteSpace(data.EarlyWithdrawalFeeType))
                {
                    Throw("Early Withdrawal Fee Type is required.");
                }

                if (!IsAllowed(data.EarlyWithdrawalFeeType, "PERCENTAGE", "FIXED_AMOUNT"))
                {
                    Throw("Invalid Early Withdrawal Fee Type.");
                }

                if (!data.EarlyWithdrawalFeeValue.HasValue)
                {
                    Throw("Early Withdrawal Fee Value is required.");
                }

                if (data.EarlyWithdrawalFeeValue.Value < 0)
                {
                    Throw("Early Withdrawal Fee cannot be negative.");
                }

                if (string.Equals(data.EarlyWithdrawalFeeType.Trim(), "PERCENTAGE", StringComparison.OrdinalIgnoreCase) && data.EarlyWithdrawalFeeValue.Value > 100)
                {
                    Throw("Early Withdrawal percentage cannot exceed 100%.");
                }
            }
            else
            {
                if (data.EarlyWithdrawalFeeValue.HasValue && data.EarlyWithdrawalFeeValue.Value > 0)
                {
                    Throw("Early Withdrawal Fee cannot be configured when Early Withdrawal is disabled.");
                }
            }
        }

        // ============================================================
        // Step 4 - Dividend / Return
        // ============================================================

        private void ValidateDividendReturn(Step4DividendReturn data, Step1BasicInformation basic)
        {
            if (data == null)
            {
                Throw("Dividend / Return configuration is required.");
            }

            if (basic == null)
            {
                Throw("Basic Information is required.");
            }

            // --------------------------------------------------------
            // Dividend Method
            // --------------------------------------------------------

            if (string.IsNullOrWhiteSpace(data.Method))
            {
                Throw("Dividend / Return Method is required.");
            }

            if (!string.Equals(data.Method.Trim(), "INVESTMENT_PERIOD_TIER_RATE", StringComparison.OrdinalIgnoreCase))
            {
                Throw("Only INVESTMENT_PERIOD_TIER_RATE is currently supported.");
            }

            // --------------------------------------------------------
            // Matrix Tiers
            // --------------------------------------------------------

            if (data.MatrixTiers == null || data.MatrixTiers.Count == 0)
            {
                Throw("At least one Dividend / Return tier is required.");
            }

            ValidatePlacementRanges(
                data.MatrixTiers
                    .Select(x =>
                        new PlacementRange
                        {
                            Minimum = x.MinimumPlacement,
                            Maximum = x.MaximumPlacement
                        })
                    .ToList(),
                "Dividend / Return");

            var ordered = data.MatrixTiers.OrderBy(x => x.MinimumPlacement).ToList();

            // --------------------------------------------------------
            // First Tier
            // --------------------------------------------------------

            if (ordered.First().MinimumPlacement != basic.MinimumPlacement)
            {
                Throw( "The first Dividend / Return tier must start from the Trust Plan Minimum Placement.");
            }

            // --------------------------------------------------------
            // Final Tier
            // --------------------------------------------------------

            if (!basic.MaximumPlacement.HasValue)
            {
                if (ordered.Last().MaximumPlacement.HasValue)
                {
                    Throw("The final Dividend / Return tier must have no maximum because the Trust Plan has no Maximum Placement.");
                }
            }
            else
            {
                if (!ordered.Last().MaximumPlacement.HasValue || ordered.Last().MaximumPlacement.Value != basic.MaximumPlacement.Value)
                {
                    Throw("The final Dividend / Return tier must match the Trust Plan Maximum Placement.");
                }
            }

            // --------------------------------------------------------
            // Rates
            // --------------------------------------------------------

            foreach (var tier in ordered)
            {
                if (tier.YearlyRates == null || tier.YearlyRates.Count == 0)
                {
                    Throw("Every Dividend / Return tier must contain yearly rates.");
                }

                if (string.Equals(basic.FundManagementPeriodUnit, "YEARS", StringComparison.OrdinalIgnoreCase))
                {
                    for (int year = 1; year <= basic.FundManagementPeriod; year++)
                    {
                        string key = year.ToString();

                        if (!tier.YearlyRates.ContainsKey(key))
                        {
                            Throw("Dividend rate for Year " + year + " is required for every tier.");
                        }
                    }

                    if (tier.YearlyRates.Count != basic.FundManagementPeriod)
                    {
                        Throw("Dividend yearly rates must match the Fund Management Period.");
                    }
                }

                foreach (var rate in tier.YearlyRates)
                {
                    int periodNo;

                    if (!int.TryParse(rate.Key, out periodNo) || periodNo <= 0)
                    {
                        Throw("Invalid Dividend period number.");
                    }

                    if (rate.Value < 0 || rate.Value > 100)
                    {
                        Throw( "Dividend rate must be between 0% and 100%.");
                    }
                }
            }
        }

        // ============================================================
        // Step 5 - Dividend Payout
        // ============================================================

        private void ValidateDividendPayout(Step5DividendPayout data)
        {
            if (data == null)
            {
                Throw("Dividend Payout configuration is required.");
            }

            // --------------------------------------------------------
            // Payout Frequency
            // --------------------------------------------------------

            if (string.IsNullOrWhiteSpace(data.PayoutFrequency))
            {
                Throw("Dividend Payout Frequency is required.");
            }

            if (!IsAllowed(data.PayoutFrequency, "MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"))
            {
                Throw("Invalid Dividend Payout Frequency.");
            }

            // --------------------------------------------------------
            // Calculation Start
            // --------------------------------------------------------

            if (string.IsNullOrWhiteSpace(data.CalculationStart))
            {
                Throw("Dividend Calculation Start is required.");
            }

            if (!IsAllowed(data.CalculationStart, "FROM_COMMENCEMENT_DATE", "FROM_APPROVAL", "FROM_COMPLETED"))
            {
                Throw("Invalid Dividend Calculation Start.");
            }
        }

        // ============================================================
        // Step 6 - Bonus Configuration
        // ============================================================

        private void ValidateBonus(Step6BonusConfiguration data)
        {
            if (data == null)
            {
                Throw("Bonus configuration is required.");
            }

            // --------------------------------------------------------
            // No Bonus Return
            // --------------------------------------------------------

            if (!data.HasBonusReturn)
            {
                if (data.BonusRules != null && data.BonusRules.Any())
                {
                    Throw("Bonus Rules are not allowed when Bonus Return is disabled.");
                }

                return;
            }

            // --------------------------------------------------------
            // Has Bonus Return
            // --------------------------------------------------------

            if (data.BonusRules == null || !data.BonusRules.Any())
            {
                Throw( "At least one Bonus Rule is required when Bonus Return is enabled.");
            }

            // --------------------------------------------------------
            // Validate Each Bonus Rule
            // --------------------------------------------------------

            foreach (var rule in data.BonusRules)
            {
                // Bonus Name
                if (string.IsNullOrWhiteSpace(rule.BonusName))
                {
                    Throw("Bonus Name is required.");
                }

                // Trigger Type
                if (string.IsNullOrWhiteSpace(rule.TriggerType))
                {
                    Throw("Trigger Type is required for Bonus Rule: " + rule.BonusName + ".");
                }

                switch (rule.TriggerType.Trim().ToUpperInvariant())
                {
                    case "YEAR_MILESTONE":

                        if (!rule.TriggerYearPeriod.HasValue || rule.TriggerYearPeriod.Value <= 0)
                        {
                            Throw("Trigger Year / Period must be greater than 0 " + "for Year Milestone Bonus Rule: " + rule.BonusName + ".");
                        }
                        break;

                    case "MATURITY":

                        // Trigger year/period is not required.
                        break;

                    case "INVESTMENT_THRESHOLD":

                        // If the current TriggerYearPeriod field is NOT
                        // actually used for threshold amount, validate
                        // the threshold-specific field here instead.
                        break;

                    case "CUSTOM":

                        // Custom-specific configuration can be validated here
                        // when Custom rules are implemented.
                        break;

                    default:
                        Throw("Invalid Trigger Type for Bonus Rule: " + rule.BonusName + ".");
                        break;
                }

                // --------------------------------------------------------
                // Bonus Rate Type
                // --------------------------------------------------------

                if (string.IsNullOrWhiteSpace(rule.BonusRateType))
                {
                    Throw("Bonus Rate Type is required for Bonus Rule: " + rule.BonusName + ".");
                }

                switch (rule.BonusRateType.Trim().ToUpperInvariant())
                {
                    case "PERCENTAGE":

                        if (rule.BonusValue <= 0 || rule.BonusValue > 100)
                        {
                            Throw(
                                "Bonus Value must be greater than 0 and " +
                                "not more than 100 when Bonus Rate Type " +
                                "is Percentage for Bonus Rule: " +
                                rule.BonusName + ".");
                        }
                        break;

                    case "FIXED_AMOUNT":

                        if (rule.BonusValue <= 0)
                        {
                            Throw(
                                "Bonus Value must be greater than 0 when " +
                                "Bonus Rate Type is Fixed Amount for Bonus Rule: " +
                                rule.BonusName + ".");
                        }
                        break;

                    default:
                        Throw("Invalid Bonus Rate Type for Bonus Rule: " + rule.BonusName + ".");
                        break;
                }

                // --------------------------------------------------------
                // Calculation Basis
                // --------------------------------------------------------

                if (string.IsNullOrWhiteSpace(rule.CalculationBasis))
                {
                    Throw("Calculation Basis is required for Bonus Rule: " + rule.BonusName + ".");
                }

                switch (rule.CalculationBasis.Trim().ToUpperInvariant())
                {
                    case "ORIGINAL_INVESTMENT":
                    case "FIRST_YEAR_PAYMENT":
                    case "ACCUMULATED_INVESTMENT":
                    case "CURRENT_BALANCE":
                        break;
                    default:
                        Throw("Invalid Calculation Basis for Bonus Rule: " + rule.BonusName + ".");
                        break;
                }

                // --------------------------------------------------------
                // Payout Timing
                // --------------------------------------------------------

                if (string.IsNullOrWhiteSpace(rule.PayoutTiming))
                {
                    Throw("Payout Timing is required for Bonus Rule: " + rule.BonusName + ".");
                }

                switch (rule.PayoutTiming.Trim().ToUpperInvariant())
                {
                    case "IMMEDIATELY":
                    case "AT_MATURITY":
                    case "SCHEDULED":
                        break;
                    default:
                        Throw("Invalid Payout Timing for Bonus Rule: " + rule.BonusName + ".");
                        break;
                }
            }
        }

        // ============================================================
        // Step 7 - Commission Configuration
        // ============================================================

        private async Task ValidateCommissionAsync(Step7CommissionConfiguration data, Step1BasicInformation basic, string merchantId)
        {
            if (data == null)
            {
                Throw("Commission configuration is required.");
            }

            if (basic == null)
            {
                Throw("Basic Information is required.");
            }

            // --------------------------------------------------------
            // Commission Disabled
            // --------------------------------------------------------

            if (!data.Enabled)
            {
                return;
            }

            // --------------------------------------------------------
            // Commission Method
            // --------------------------------------------------------

            if (string.IsNullOrWhiteSpace(data.Method))
            {
                Throw("Commission Method is required.");
            }

            if (!string.Equals(data.Method.Trim(), "ONE_OFF_COMMISSION", StringComparison.OrdinalIgnoreCase))
            {
                Throw("Only ONE_OFF_COMMISSION is currently supported.");
            }

            // --------------------------------------------------------
            // One-Off Commission Tiers
            // --------------------------------------------------------

            if (data.OneOff == null || data.OneOff.Tiers == null || data.OneOff.Tiers.Count == 0)
            {
                Throw("One-Off Commission tiers are required.");
            }

            // --------------------------------------------------------
            // Check Null Tier
            // --------------------------------------------------------

            if (data.OneOff.Tiers.Any(x => x == null))
            {
                Throw("Invalid Commission Tier.");
            }

            // --------------------------------------------------------
            // Duplicate Rank
            // --------------------------------------------------------

            var duplicateRanks =
                data.OneOff.Tiers
                    .Where(x => !string.IsNullOrWhiteSpace(x.Rank))
                    .GroupBy(x => x.Rank.Trim(), StringComparer.OrdinalIgnoreCase)
                    .Where(x => x.Count() > 1).Select(x => x.Key)
                    .ToList();

            if (duplicateRanks.Any())
            {
                Throw("Duplicate Commission Rank is not allowed: " + string.Join(", ", duplicateRanks));
            }

            // --------------------------------------------------------
            // Load Agent Rank from Database
            // --------------------------------------------------------

            var validRanks =
                await dbR.tbl_AgentRank
                    .Where(x => x.MerchantID == merchantId && x.Status == 0)
                    .Select(x => x.RankCode)
                    .ToListAsync();

            // --------------------------------------------------------
            // Validate Tier
            // --------------------------------------------------------

            foreach (var tier in data.OneOff.Tiers)
            {
                // ----------------------------------------------------
                // Rank Required
                // ----------------------------------------------------

                if (string.IsNullOrWhiteSpace(tier.Rank))
                {
                    Throw("Commission Rank is required.");
                }

                string commissionRank = tier.Rank.Trim();

                // ----------------------------------------------------
                // Rank must exist in tbl_AgentRank
                // ----------------------------------------------------

                bool validRank = validRanks.Any(x => string.Equals(x, commissionRank, StringComparison.OrdinalIgnoreCase));
                if (!validRank)
                {
                    Throw("Invalid Commission Rank: " + commissionRank);
                }

                // ----------------------------------------------------
                // Rank must be in Execution Rank
                // ----------------------------------------------------

                if (basic.ExecutionRanks == null || !basic.ExecutionRanks.Any(x => !string.IsNullOrWhiteSpace(x) && string.Equals(x.Trim(), commissionRank, StringComparison.OrdinalIgnoreCase)))
                {
                    Throw("Commission Rank " + commissionRank + " is not configured as an Execution Rank.");
                }

                // ----------------------------------------------------
                // Commission Type
                // ----------------------------------------------------

                if (string.IsNullOrWhiteSpace(tier.CommissionType))
                {
                    Throw("Commission Type is required.");
                }

                if (!IsAllowed(tier.CommissionType, "PERSONAL", "OVERRIDING"))
                {
                    Throw("Invalid Commission Type.");
                }

                // ----------------------------------------------------
                // Commission Rate
                // ----------------------------------------------------

                if (tier.Rate < 0 || tier.Rate > 100)
                {
                    Throw("Commission Rate must be between 0% and 100%.");
                }
            }
        }

        // ============================================================
        // Step 8 - Commission Rules
        // ============================================================

        private void ValidateCommissionRules(Step8CommissionRules data)
        {
            if (data == null)
            {
                Throw("Commission Rules are required.");
            }

            // --------------------------------------------------------
            // Calculation Basis
            // --------------------------------------------------------

            if (string.IsNullOrWhiteSpace(data.CalculationBasis))
            {
                Throw("Commission Calculation Basis is required.");
            }

            if (!string.Equals(data.CalculationBasis.Trim(), "GROSS_PLACEMENT_AMOUNT", StringComparison.OrdinalIgnoreCase))
            {
                Throw("Only GROSS_PLACEMENT_AMOUNT is currently supported.");
            }

            // --------------------------------------------------------
            // Rank Determination
            // --------------------------------------------------------

            if (string.IsNullOrWhiteSpace(data.RankDetermination))
            {
                Throw("Commission Rank Determination is required.");
            }

            if (!string.Equals(data.RankDetermination.Trim(), "RANK_AT_COMPLETED", StringComparison.OrdinalIgnoreCase))
            {
                Throw("Only RANK_AT_COMPLETED is currently supported.");
            }
        }

        // ============================================================
        // Step 9 - Complimentary Benefits
        // ============================================================

        private void ValidateComplimentaryBenefits(Step9ComplimentaryBenefits data, Step1BasicInformation basic)
        {
            if (data == null)
            {
                Throw("Complimentary Benefits configuration is required.");
            }

            if (basic == null)
            {
                Throw("Basic Information is required.");
            }

            // --------------------------------------------------------
            // Complimentary Benefits Disabled
            // --------------------------------------------------------

            if (!data.HasComplimentaryBenefits)
            {
                if (data.Benefits != null && data.Benefits.Count > 0)
                {
                    Throw("Complimentary Benefit records cannot be supplied when Complimentary Benefits are disabled.");
                }

                return;
            }

            // --------------------------------------------------------
            // Benefit Required
            // --------------------------------------------------------

            if (data.Benefits == null || data.Benefits.Count == 0)
            {
                Throw("At least one Complimentary Benefit is required.");
            }

            if (data.Benefits.Any(x => x == null))
            {
                Throw("Invalid Complimentary Benefit.");
            }

            // --------------------------------------------------------
            // Placement Range
            // --------------------------------------------------------

            ValidatePlacementRanges(
                data.Benefits
                    .Select(x =>
                        new PlacementRange
                        {
                            Minimum = x.MinimumPlacement,
                            Maximum = x.MaximumPlacement
                        })
                    .ToList(),
                "Complimentary Benefit");

            // --------------------------------------------------------
            // Validate Benefit
            // --------------------------------------------------------

            foreach (var benefit in data.Benefits)
            {
                // ----------------------------------------------------
                // Minimum Placement
                // ----------------------------------------------------

                if (benefit.MinimumPlacement < basic.MinimumPlacement)
                {
                    Throw("Complimentary Benefit Minimum Placement cannot be below the Trust Plan Minimum Placement.");
                }

                // ----------------------------------------------------
                // Maximum Placement
                // ----------------------------------------------------

                if (basic.MaximumPlacement.HasValue)
                {
                    if (!benefit.MaximumPlacement.HasValue)
                    {
                        Throw("Complimentary Benefit Maximum Placement cannot be unlimited when the Trust Plan has a Maximum Placement.");
                    }

                    if (benefit.MaximumPlacement.Value > basic.MaximumPlacement.Value)
                    {
                        Throw("Complimentary Benefit Maximum Placement cannot exceed the Trust Plan Maximum Placement.");
                    }
                }

                // ----------------------------------------------------
                // Benefit Name
                // ----------------------------------------------------

                if (string.IsNullOrWhiteSpace(benefit.BenefitName))
                {
                    Throw("Complimentary Benefit Name is required.");
                }

                if (benefit.BenefitName.Trim().Length > 250)
                {
                    Throw("Complimentary Benefit Name cannot exceed 250 characters.");
                }

                // ----------------------------------------------------
                // Benefit Value
                // ----------------------------------------------------

                if (benefit.BenefitValue.HasValue && benefit.BenefitValue.Value < 0)
                {
                    Throw("Complimentary Benefit Value cannot be negative.");
                }

                // ----------------------------------------------------
                // Fulfilment Method
                // ----------------------------------------------------

                if (string.IsNullOrWhiteSpace(benefit.FulfilmentMethod))
                {
                    Throw("Complimentary Benefit Fulfilment Method is required.");
                }

                if (!string.Equals(benefit.FulfilmentMethod.Trim(), "MANUAL", StringComparison.OrdinalIgnoreCase))
                {
                    Throw("Only MANUAL Complimentary Benefit fulfilment is currently supported.");
                }
            }
        }

        // ============================================================
        // Placement Range Validation
        // ============================================================

        private void ValidatePlacementRanges(List<PlacementRange> ranges, string name)
        {
            if (ranges == null || ranges.Count == 0)
            {
                Throw(name + " ranges are required.");
            }

            var ordered = ranges.OrderBy(x => x.Minimum).ToList();

            // --------------------------------------------------------
            // Only one unlimited tier is allowed
            // --------------------------------------------------------

            int unlimitedCount = ordered.Count(x => !x.Maximum.HasValue);

            if (unlimitedCount > 1)
            {
                Throw("Only one unlimited " + name + " tier is allowed.");
            }

            // --------------------------------------------------------
            // Validate Range
            // --------------------------------------------------------

            for (int i = 0; i < ordered.Count; i++)
            {
                var current = ordered[i];

                // ----------------------------------------------------
                // Minimum cannot be negative
                // ----------------------------------------------------

                if (current.Minimum < 0)
                {
                    Throw(name + " Minimum Placement cannot be negative.");
                }

                // ----------------------------------------------------
                // Maximum cannot be less than Minimum
                // ----------------------------------------------------

                if (current.Maximum.HasValue && current.Maximum.Value < current.Minimum)
                {
                    Throw(name +  " Maximum Placement cannot be less than Minimum Placement.");
                }

                // ----------------------------------------------------
                // Unlimited must be last
                // ----------------------------------------------------

                if (!current.Maximum.HasValue && i != ordered.Count - 1)
                {
                    Throw("Unlimited " + name + " tier must be the final tier.");
                }

                // ----------------------------------------------------
                // Compare with previous range
                // ----------------------------------------------------

                if (i > 0)
                {
                    var previous = ordered[i - 1];

                    if (!previous.Maximum.HasValue)
                    {
                        Throw("No tier can follow an unlimited " + name + " tier.");
                    }

                    // ------------------------------------------------
                    // Prevent overlap
                    // ------------------------------------------------

                    if (current.Minimum <= previous.Maximum.Value)
                    {
                        Throw(name + " placement tiers cannot overlap.");
                    }
                }
            }
        }

        // ============================================================
        // Allowed Value Helper
        // ============================================================

        private bool IsAllowed(string value, params string[] allowed)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return false;
            }

            return allowed.Any(x => string.Equals(x, value.Trim(), StringComparison.OrdinalIgnoreCase));
        }

        // ============================================================
        // Throw Business Exception
        // ============================================================

        private void Throw(string message)
        {
            throw new BusinessException(message, Code);
        }

        // ============================================================
        // Common Function
        // ============================================================

        private int ConvertToMonths(int value, string unit)
        {
            if (string.Equals(unit, "YEARS", StringComparison.OrdinalIgnoreCase))
            {
                return value * 12;
            }

            if (string.Equals(unit, "MONTHS", StringComparison.OrdinalIgnoreCase))
            {
                return value;
            }

            Throw("Invalid period unit.");
            return 0;
        }

        // ============================================================
        // Internal Placement Range Model
        // ============================================================

        private class PlacementRange
        {
            public decimal Minimum
            {
                get;
                set;
            }

            public decimal? Maximum
            {
                get;
                set;
            }
        }
    }
}