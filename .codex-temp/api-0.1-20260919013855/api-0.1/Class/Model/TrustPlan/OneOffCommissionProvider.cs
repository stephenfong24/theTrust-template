using API_CPX.Class.Model.TrustPlan;
using API_CPX.Class.Service.TrustPlan;
using API_CPX.Context;
using System;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Services.TrustPlan.Commission
{
    public class OneOffCommissionProvider : ICommissionConfigurationProvider
    {
        private readonly Sandbox_BasedEntities dbR;

        public OneOffCommissionProvider(Sandbox_BasedEntities dbR)
        {
            this.dbR = dbR ?? throw new ArgumentNullException(nameof(dbR));
        }

        public bool CanHandle(string method)
        {
            return string.Equals( method, "ONE_OFF_COMMISSION", StringComparison.OrdinalIgnoreCase);
        }

        public async Task<object> GetConfigurationAsync(long trustPlanId)
        {
            var tiers =
                await dbR
                    .tbl_TrustPlanCommissionOneOffTier
                    .Where(x => x.TrustPlanID == trustPlanId)
                    .OrderBy(x => x.Sequence)
                    .Select(x =>
                        new OneOffCommissionTierRequest
                        {
                            Rank = x.RankCode,
                            CommissionType = x.CommissionType,
                            Rate = x.CommissionRate
                        })
                    .ToListAsync();

            return new OneOffCommissionConfiguration
            {
                Tiers = tiers
            };
        }
    }
}