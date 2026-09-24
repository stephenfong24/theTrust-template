using API_CPX.Class.Exceptions;
using API_CPX.Class.Model.TrustPlan;
using API_CPX.Context;
using Newtonsoft.Json.Linq;
using System;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Class.Service.TrustApplication.Dividend.Provider
{
    public class InvestmentPeriodTierRateDividendProvider : ITrustApplicationDividendProvider
    {
        private const string Code = "TRUST-APPLICATION-DIVIDEND";

        private const string Method = "INVESTMENT_PERIOD_TIER_RATE";

        // ============================================================
        // Can Handle
        // ============================================================

        public bool CanHandle(string method)
        {
            return string.Equals(method, Method, StringComparison.OrdinalIgnoreCase);
        }

        // ============================================================
        // Generate
        // ============================================================

        public async Task GenerateAsync(Sandbox_BasedEntities db, tbl_TrustApplication application, TrustPlanDetailsResponse plan, long userId, DateTime completedAt)
        {
            if (db == null)
            {
                throw new ArgumentNullException(nameof(db));
            }

            if (application == null)
            {
                throw new ArgumentNullException(nameof(application));
            }

            if (plan == null || plan.Steps == null)
            {
                throw new BusinessException("Trust Plan Snapshot configuration is missing.", Code);
            }

            // ========================================================
            // Step 1 - Basic Information
            // ========================================================

            var basic = plan.Steps.Step1BasicInformation;

            if (basic == null)
            {
                throw new BusinessException("Trust Plan Basic Information is missing.", Code);
            }

            if (basic.FundManagementPeriod <= 0)
            {
                throw new BusinessException("Fund Management Period is invalid.", Code);
            }

            string fundManagementPeriodUnit = Normalize(basic.FundManagementPeriodUnit);

            /*
             * INVESTMENT_PERIOD_TIER_RATE currently stores
             * rates using:
             *
             * YearlyRates["1"]
             * YearlyRates["2"]
             * ...
             */

            if (fundManagementPeriodUnit != "YEARS")
            {
                throw new BusinessException("Investment + Period Tier Rate currently requires Fund Management Period Unit YEARS.", Code);
            }

            // ========================================================
            // Step 4 - Dividend / Return
            // ========================================================

            var dividend = plan.Steps.Step4DividendReturn;

            if (dividend == null)
            {
                throw new BusinessException("Dividend / Return configuration is missing.", Code);
            }

            /*
             * The resolver should already have selected this provider.
             * Keep this check as defensive validation.
             */

            if (!CanHandle(dividend.Method))
            {
                throw new BusinessException("Invalid Dividend / Return Method for Investment Period Tier Rate Provider.", Code);
            }

            // ========================================================
            // Convert Configuration
            // ========================================================

            var dividendConfiguration = ConvertDividendConfiguration(dividend.Configuration);

            if (dividendConfiguration == null || dividendConfiguration.Tiers == null || !dividendConfiguration.Tiers.Any())
            {
                throw new BusinessException("Investment + Period Tier Rate configuration is missing.", Code);
            }

            // ========================================================
            // Step 5 - Dividend Payout
            // ========================================================

            var payoutConfig = plan.Steps.Step5DividendPayout;

            if (payoutConfig == null)
            {
                throw new BusinessException("Dividend Payout configuration is missing.", Code);
            }

            string payoutFrequency = Normalize(payoutConfig.PayoutFrequency);
            string calculationStart = Normalize(payoutConfig.CalculationStart);

            // ========================================================
            // Trust Application Trust Asset
            // ========================================================

            var trustAsset = await db.tbl_TrustApplication_TrustAsset.FirstOrDefaultAsync(x => x.TrustApplicationID == application.RowID);

            if (trustAsset == null)
            {
                throw new BusinessException("Trust Application Trust Asset is missing.", Code);
            }

            decimal calculationBasisAmount = trustAsset.TrustAssetAmount;

            if (calculationBasisAmount <= 0)
            {
                throw new BusinessException("Trust Asset Amount must be greater than zero.", Code);
            }

            string returnOption = Normalize(trustAsset.GuaranteedReturnOption);

            // ========================================================
            // Validate Return Option
            // ========================================================

            ValidateReturnOption(returnOption, payoutConfig.AllowDividendRedeposit);

            // ========================================================
            // Select Matching Tier
            // ========================================================

            var selectedTier =
                dividendConfiguration.Tiers
                    .Where(x => calculationBasisAmount >= x.MinimumPlacement && (!x.MaximumPlacement.HasValue || calculationBasisAmount <= x.MaximumPlacement.Value))
                    .OrderBy(x => x.MinimumPlacement)
                    .FirstOrDefault();

            if (selectedTier == null)
            {
                throw new BusinessException("No Dividend / Return tier matches the Trust Asset Amount.", Code);
            }

            if (selectedTier.YearlyRates == null || !selectedTier.YearlyRates.Any())
            {
                throw new BusinessException("Dividend / Return yearly rates are missing.", Code);
            }

            // ========================================================
            // Resolve Payout Frequency
            // ========================================================

            int periodsPerYear;
            int monthsPerPeriod;

            ResolveFrequency(payoutFrequency, out periodsPerYear, out monthsPerPeriod);

            // ========================================================
            // Resolve Calculation Start
            // ========================================================

            DateTime calculationStartDate = await ResolveCalculationStartDateAsync(db, application, calculationStart, completedAt);

            // ========================================================
            // Generate Schedule
            // ========================================================

            int scheduleNo = 0;

            for (int returnYear = 1; returnYear <= basic.FundManagementPeriod; returnYear++)
            {
                string rateKey = returnYear.ToString();

                if (!selectedTier.YearlyRates.ContainsKey(rateKey))
                {
                    throw new BusinessException("Dividend / Return rate for Year " + returnYear + " is missing.", Code);
                }

                decimal annualRate = selectedTier.YearlyRates[rateKey];

                if (annualRate < 0 || annualRate > 100)
                {
                    throw new BusinessException("Dividend / Return rate for Year " + returnYear + " is invalid.", Code);
                }

                // ====================================================
                // Annual Base Dividend
                // ====================================================

                decimal annualBaseDividendAmount = RoundMoney(calculationBasisAmount * annualRate / 100m);
                decimal allocatedBaseDividendAmount = 0m;

                // ====================================================
                // Generate Periods
                // ====================================================

                for (int periodNo = 1; periodNo <= periodsPerYear; periodNo++)
                {
                    scheduleNo++;

                    // ================================================
                    // Schedule Dates
                    // ================================================

                    DateTime periodStartDate = calculationStartDate.AddMonths((scheduleNo - 1) * monthsPerPeriod).Date;
                    DateTime payoutDate = calculationStartDate.AddMonths(scheduleNo * monthsPerPeriod).Date;
                    DateTime periodEndDate = payoutDate.AddDays(-1).Date;

                    // ================================================
                    // Base Dividend
                    // ================================================

                    decimal baseDividendAmount;

                    if (periodNo == periodsPerYear)
                    {
                        /*
                         * Last period absorbs the
                         * rounding remainder.
                         */

                        baseDividendAmount = annualBaseDividendAmount - allocatedBaseDividendAmount;
                    }
                    else
                    {
                        baseDividendAmount = RoundMoney(annualBaseDividendAmount / periodsPerYear);
                        allocatedBaseDividendAmount += baseDividendAmount;
                    }

                    // ================================================
                    // Bonus
                    //
                    // Reserved for future Step 6 implementation.
                    // ================================================

                    decimal bonusAmount = 0m;

                    // ================================================
                    // Total Return
                    // ================================================

                    decimal totalReturnAmount = RoundMoney(baseDividendAmount + bonusAmount);

                    // ================================================
                    // Payout / Redeposit
                    // ================================================

                    decimal payoutAmount = 0m;
                    decimal redepositAmount = 0m;

                    if (returnOption == "REDEPOSIT_AS_TRUST_ASSET")
                    {
                        redepositAmount = totalReturnAmount;
                    }
                    else
                    {
                        payoutAmount = totalReturnAmount;
                    }

                    // ================================================
                    // Create Schedule
                    // ================================================

                    var schedule =
                        new tbl_TrustApplication_DividendSchedule
                        {
                            TrustApplicationID = application.RowID,
                            ScheduleNo = scheduleNo,
                            ReturnYear = returnYear,
                            PeriodNo = periodNo,
                            DividendMethod = Method,
                            PayoutFrequency = payoutFrequency,
                            CalculationStart = calculationStart,
                            PeriodStartDate = periodStartDate,
                            PeriodEndDate = periodEndDate,
                            PayoutDate = payoutDate,
                            CalculationBasisAmount = calculationBasisAmount,
                            AnnualRate = annualRate,
                            BaseDividendAmount = baseDividendAmount,
                            BonusAmount = bonusAmount,
                            TotalReturnAmount = totalReturnAmount,
                            ReturnOption = returnOption,
                            PayoutAmount = payoutAmount,
                            RedepositAmount = redepositAmount,
                            Status = "SCHEDULED",
                            CreatedAt = completedAt,
                            CreatedBy = userId
                        };

                    db.tbl_TrustApplication_DividendSchedule.Add(schedule);
                }
            }
        }

        // ============================================================
        // Convert Configuration
        // ============================================================

        private InvestmentPeriodTierRateConfiguration ConvertDividendConfiguration(object configuration)
        {
            if (configuration == null)
            {
                return null;
            }

            var typedConfiguration = configuration as InvestmentPeriodTierRateConfiguration;

            if (typedConfiguration != null)
            {
                return typedConfiguration;
            }

            var jObject = configuration as JObject;

            if (jObject != null)
            {
                return jObject.ToObject<InvestmentPeriodTierRateConfiguration>();
            }

            return JObject.FromObject(configuration).ToObject<InvestmentPeriodTierRateConfiguration>();
        }

        // ============================================================
        // Validate Return Option
        // ============================================================

        private void ValidateReturnOption(string returnOption, bool allowDividendRedeposit)
        {
            if (returnOption == "TRANSFER_TO_BANK")
            {
                return;
            }

            if (returnOption == "REDEPOSIT_AS_TRUST_ASSET")
            {
                if (!allowDividendRedeposit)
                {
                    throw new BusinessException("Dividend Redeposit is not allowed by this Trust Plan.", Code);
                }
                return;
            }

            throw new BusinessException("Invalid Guaranteed Return Option.", Code);
        }

        // ============================================================
        // Resolve Frequency
        // ============================================================

        private void ResolveFrequency(string payoutFrequency, out int periodsPerYear, out int monthsPerPeriod)
        {
            switch (payoutFrequency)
            {
                case "MONTHLY":
                    periodsPerYear = 12;
                    monthsPerPeriod = 1;
                    return;

                case "QUARTERLY":
                    periodsPerYear = 4;
                    monthsPerPeriod = 3;
                    return;

                case "HALF_YEARLY":
                    periodsPerYear = 2;
                    monthsPerPeriod = 6;
                    return;

                case "YEARLY":
                    periodsPerYear = 1;
                    monthsPerPeriod = 12;
                    return;

                default:
                    throw new BusinessException("Unsupported Dividend Payout Frequency: " + payoutFrequency + ".", Code);
            }
        }

        // ============================================================
        // Resolve Calculation Start
        // ============================================================

        private async Task<DateTime> ResolveCalculationStartDateAsync(Sandbox_BasedEntities db, tbl_TrustApplication application, string calculationStart, DateTime completedAt)
        {
            switch (calculationStart)
            {
                case "FROM_COMMENCEMENT_DATE":

                    if (!application.CommencementDate.HasValue)
                    {
                        throw new BusinessException("Trust Application Commencement Date is missing.", Code);
                    }

                    return application.CommencementDate.Value.Date;

                case "FROM_APPROVAL":

                    var approvalHistory =
                        await db.tbl_TrustApplication_StatusHistory
                            .Where(x => x.TrustApplicationID == application.RowID && x.NewStatus == "PAYMENT_APPROVED")
                            .OrderByDescending(x => x.ChangedAt)
                            .FirstOrDefaultAsync();

                    if (approvalHistory == null)
                    {
                        throw new BusinessException("Trust Application Payment Approval date is missing.", Code);
                    }

                    return approvalHistory.ChangedAt.Date;

                case "FROM_COMPLETED":

                    return completedAt.Date;

                default:

                    throw new BusinessException("Unsupported Dividend Calculation Start: " + calculationStart + ".", Code);
            }
        }

        // ============================================================
        // Round Money
        // ============================================================

        private decimal RoundMoney(decimal amount)
        {
            return Math.Round(amount, 2, MidpointRounding.AwayFromZero);
        }

        // ============================================================
        // Normalize
        // ============================================================

        private string Normalize(string value)
        {
            return string.IsNullOrWhiteSpace(value) ? null : value.Trim().ToUpperInvariant();
        }
    }
}