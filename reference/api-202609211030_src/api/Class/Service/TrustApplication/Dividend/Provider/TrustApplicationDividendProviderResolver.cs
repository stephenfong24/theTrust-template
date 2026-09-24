using API_CPX.Class.Exceptions;
using System.Collections.Generic;
using System.Linq;

namespace API_CPX.Class.Service.TrustApplication.Dividend.Provider
{
    public class TrustApplicationDividendProviderResolver
    {
        private const string Code = "TRUST-APPLICATION-DIVIDEND";
        private readonly List<ITrustApplicationDividendProvider> _providers;

        public TrustApplicationDividendProviderResolver()
        {
            _providers =
                new List<ITrustApplicationDividendProvider>
                {
                    new InvestmentPeriodTierRateDividendProvider()
                };
        }

        public ITrustApplicationDividendProvider Resolve(string method)
        {
            if (string.IsNullOrWhiteSpace(method))
            {
                throw new BusinessException("Dividend / Return Method is required.", Code);
            }

            var provider = _providers.FirstOrDefault(x => x.CanHandle(method));

            if (provider == null)
            {
                throw new BusinessException("Unsupported Dividend / Return Method: " + method + ".", Code);
            }

            return provider;
        }
    }
}