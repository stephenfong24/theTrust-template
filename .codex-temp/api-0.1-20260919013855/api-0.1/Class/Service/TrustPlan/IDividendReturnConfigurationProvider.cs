using System.Threading.Tasks;

namespace API_CPX.Class.Service.TrustPlan
{
    public interface IDividendReturnConfigurationProvider
    {
        bool CanHandle(string method);

        Task<object> GetConfigurationAsync(long trustPlanId);
    }
}