using API_CPX.Class.Exceptions;
using API_CPX.Class.Service.TrustPlan;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Services.TrustPlan.Commission
{
    public class CommissionConfigurationResolver
    {
        private readonly List<ICommissionConfigurationProvider> providers;

        public CommissionConfigurationResolver(IEnumerable<ICommissionConfigurationProvider> providers)
        {
            this.providers = providers.ToList();
        }

        public async Task<object> GetConfigurationAsync(string method, long trustPlanId)
        {
            var provider = providers.FirstOrDefault(x => x.CanHandle(method));
            if (provider == null)
            {
                throw new BusinessException("Unsupported Commission Method: " + method, "GET-TRUST-PRODUCT-DETAILS");
            }

            return await provider.GetConfigurationAsync(trustPlanId);
        }
    }
}