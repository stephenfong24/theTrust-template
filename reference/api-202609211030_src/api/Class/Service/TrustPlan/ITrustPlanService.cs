using API_CPX.Class.Model.TrustPlan;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace API_CPX.Class.Service.TrustPlan
{
    interface ITrustPlanService
    {
        Task<string> CreateAsync(
            TrustPlanRequest request,
            long? userId, string merchantId);

        Task UpdateAsync(
            string productCode,
            TrustPlanRequest request,
            long? userId, string merchantId);

        Task<TrustPlanListResponse> GetTrustProductListAsync(
            TrustPlanListRequest request,
            string merchantId);

        Task<TrustPlanDetailsResponse> GetTrustProductDetailsAsync(
            string productCode,
            string merchantId);
    }
}
