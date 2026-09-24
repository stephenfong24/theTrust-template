using System.Threading.Tasks;

namespace API_CPX.Class.Service.TrustPlan
{
    public interface ICommissionConfigurationProvider
    {
        bool CanHandle(string method);

        Task<object> GetConfigurationAsync(long trustPlanId);
    }
}