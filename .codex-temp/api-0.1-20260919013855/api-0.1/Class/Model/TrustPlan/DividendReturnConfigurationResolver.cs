using API_CPX.Class.Exceptions;
using API_CPX.Class.Service.TrustPlan;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Services.TrustPlan.Dividend
{
    public class DividendReturnConfigurationResolver
    {
        private readonly List<IDividendReturnConfigurationProvider> providers;

        public DividendReturnConfigurationResolver(IEnumerable<IDividendReturnConfigurationProvider> providers)
        {
            this.providers = providers.ToList();
        }

        public async Task<object> GetConfigurationAsync(string method, long trustPlanId)
        {
            var provider = providers.FirstOrDefault(x => x.CanHandle(method));

            if (provider == null)
            {
                throw new BusinessException("Unsupported Dividend / Return Method: " + method, "GET-TRUST-PRODUCT-DETAILS");
            }

            return await provider.GetConfigurationAsync(trustPlanId);
        }
    }
}