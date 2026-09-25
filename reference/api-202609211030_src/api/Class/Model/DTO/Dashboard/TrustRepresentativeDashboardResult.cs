using System;
using System.Collections.Generic;

namespace API_CPX.Class.Model.DTO.Dashboard
{
    public class TrustRepresentativeDashboardResult
    {
        public int Year { get; set; }
        public TrustRepresentativeSummaryResult Summary { get; set; }
        public List<DashboardMonthlySalesResult> PersonalSalesTrend { get; set; }
        public DashboardRankProgressResult RankProgress { get; set; }
        public DashboardApplicationStatusResult ApplicationStatus { get; set; }
        public DashboardCommissionSummaryResult Commission { get; set; }
        public DashboardNetworkSummaryResult Network { get; set; }
        public DashboardActionRequiredResult ActionRequired { get; set; }
        public List<DashboardRecentApplicationResult> RecentApplications { get; set; }
    }

    public class TrustRepresentativeSummaryResult
    {
        public decimal PersonalSales { get; set; }
        public decimal ActiveTrustValue { get; set; }
        public int ActiveTrustCount { get; set; }
        public int CompletedTrusts { get; set; }
        public int Ranking { get; set; }
        public string RankCode { get; set; }
        public string RankName { get; set; }
    }

    public class DashboardMonthlySalesResult
    {
        public int Month { get; set; }
        public string MonthName { get; set; }
        public decimal Amount { get; set; }
        public int CompletedTrusts { get; set; }
    }

    public class DashboardRankProgressResult
    {
        public int Ranking { get; set; }
        public string RankCode { get; set; }
        public string RankName { get; set; }
        public decimal PersonalSales { get; set; }
        public decimal PersonalSalesTarget { get; set; }
        public decimal PersonalSalesRemaining { get; set; }
        public decimal ProgressPercentage { get; set; }
    }

    public class DashboardApplicationStatusResult
    {
        public int Total { get; set; }
        public int Draft { get; set; }
        public int PendingPayment { get; set; }
        public int Processing { get; set; }
        public int Completed { get; set; }
        public int Matured { get; set; }
        public int EarlyWithdrawn { get; set; }
        public int Rejected { get; set; }
    }

    public class DashboardCommissionSummaryResult
    {
        public bool Available { get; set; }
        public decimal TotalEarned { get; set; }
        public decimal ThisMonth { get; set; }
        public decimal Pending { get; set; }
    }

    public class DashboardNetworkSummaryResult
    {
        public int DirectDownline { get; set; }
    }

    public class DashboardActionRequiredResult
    {
        public int Total { get; set; }
        public int DraftApplications { get; set; }
        public int AwaitingPayment { get; set; }
        public int PaymentPendingApproval { get; set; }
    }

    public class DashboardRecentApplicationResult
    {
        public long TrustID { get; set; }
        public string ProductCode { get; set; }
        public string SettlorName { get; set; }
        public decimal TrustAssetAmount { get; set; }
        public string ApplicationStatus { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}