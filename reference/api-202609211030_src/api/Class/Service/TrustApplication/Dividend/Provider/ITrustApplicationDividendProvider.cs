using API_CPX.Class.Model.TrustPlan;
using API_CPX.Context;
using System;
using System.Threading.Tasks;

namespace API_CPX.Class.Service.TrustApplication.Dividend.Provider
{
    public interface ITrustApplicationDividendProvider
    {
        bool CanHandle(string method);

        Task GenerateAsync(
            Sandbox_BasedEntities db,
            tbl_TrustApplication application,
            TrustPlanDetailsResponse plan,
            long userId,
            DateTime completedAt);
    }
}