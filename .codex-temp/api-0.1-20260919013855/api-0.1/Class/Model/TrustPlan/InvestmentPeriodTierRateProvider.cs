using API_CPX.Class.Model.TrustPlan;
using API_CPX.Class.Service.TrustPlan;
using API_CPX.Context;
using System;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Services.TrustPlan.Dividend
{
    public class InvestmentPeriodTierRateProvider
        : IDividendReturnConfigurationProvider
    {
        private readonly Sandbox_BasedEntities dbR;


        public InvestmentPeriodTierRateProvider(
            Sandbox_BasedEntities dbR)
        {
            this.dbR =
                dbR ??
                throw new ArgumentNullException(
                    nameof(dbR));
        }


        public bool CanHandle(
            string method)
        {
            return string.Equals(
                method,
                "INVESTMENT_PERIOD_TIER_RATE",
                StringComparison.OrdinalIgnoreCase);
        }


        public async Task<object> GetConfigurationAsync(
            long trustPlanId)
        {
            var tiers =
                await dbR
                    .tbl_TrustPlanDividendInvestmentPeriodTier
                    .Where(x =>
                        x.TrustPlanID ==
                        trustPlanId)
                    .OrderBy(x =>
                        x.Sequence)
                    .ToListAsync();


            var tierIds =
                tiers
                    .Select(x =>
                        x.RowID)
                    .ToList();


            var rates =
                await dbR
                    .tbl_TrustPlanDividendInvestmentPeriodTierRate
                    .Where(x =>
                        tierIds.Contains(
                            x.InvestmentPeriodTierID))
                    .OrderBy(x =>
                        x.PeriodNo)
                    .ToListAsync();


            return new InvestmentPeriodTierRateConfiguration
            {
                Tiers =
                    tiers
                        .Select(tier =>
                            new DividendInvestmentPeriodTierRequest
                            {
                                MinimumPlacement =
                                    tier.MinimumPlacement,

                                MaximumPlacement =
                                    tier.MaximumPlacement,

                                YearlyRates =
                                    rates
                                        .Where(rate =>
                                            rate.InvestmentPeriodTierID ==
                                            tier.RowID)
                                        .OrderBy(rate =>
                                            rate.PeriodNo)
                                        .ToDictionary(
                                            rate =>
                                                rate.PeriodNo.ToString(),

                                            rate =>
                                                rate.Rate)
                            })
                        .ToList()
            };
        }
    }
}