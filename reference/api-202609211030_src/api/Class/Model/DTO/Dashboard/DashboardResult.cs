using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace API_CPX.Class.Model.DTO.Dashboard
{
    public class DashboardResult
    {
        public string RoleCode { get; set; }

        public TrustRepresentativeDashboardResult TrustRepresentative { get; set; }
        public AdminDashboardResult Admin { get; set; }

        // Future
        // public FinanceDashboardResult Finance { get; set; }
        // public OperationDashboardResult Operation { get; set; }
        // public AdminDashboardResult Admin { get; set; }
        // public SuperAdminDashboardResult SuperAdmin { get; set; }
    }
}