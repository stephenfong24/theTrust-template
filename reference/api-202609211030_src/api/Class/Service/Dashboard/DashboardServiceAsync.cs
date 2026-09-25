using API_CPX.Class.Exceptions;
using API_CPX.Class.Model.DTO.Dashboard;
using System;
using System.Threading.Tasks;

namespace API_CPX.Class.Service.Dashboard
{
    public class DashboardServiceAsync
    {
        public async Task<DashboardResult> GetAsync(string merchantId, long userId, string roleCode, int year)
        {
            if (string.IsNullOrWhiteSpace(roleCode))
            {
                throw new BusinessException("Invalid user role.", "GET-DASHBOARD");
            }

            roleCode = roleCode.Trim().ToUpperInvariant();

            switch (roleCode)
            {
                case "AG":
                    {
                        var service = new TrustRepresentativeDashboardServiceAsync();
                        var result = await service.GetAsync(merchantId, userId, year);

                        return new DashboardResult
                        {
                            RoleCode = roleCode,
                            TrustRepresentative = result
                        };
                    }

                case "AC":
                    throw new BusinessException("Finance dashboard is not available yet.", "GET-DASHBOARD");

                case "OP":
                    throw new BusinessException("Operation dashboard is not available yet.", "GET-DASHBOARD");

                case "AD":
                case "SA":
                    {
                        var service = new AdminDashboardServiceAsync();
                        var result = await service.GetAsync(merchantId, year);

                        return new DashboardResult
                        {
                            RoleCode = roleCode,
                            Admin = result
                        };
                    }

                default:
                    throw new BusinessException("Dashboard is not available for this role.", "GET-DASHBOARD");
            }
        }
    }
}