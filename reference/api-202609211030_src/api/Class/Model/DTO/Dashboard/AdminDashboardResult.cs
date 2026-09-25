using System.Collections.Generic;

namespace API_CPX.Class.Model.DTO.Dashboard
{
    public class AdminDashboardResult
    {
        public int Year { get; set; }
        public AdminDashboardSummaryResult Summary { get; set; }
        public List<DashboardMonthlyPlacementResult> PlacementTrend { get; set; }
        public AdminDashboardApplicationPipelineResult ApplicationPipeline { get; set; }
        public List<DashboardPlacementCollectionResult> PlacementVsCollection { get; set; }
        public AdminDashboardAgentNetworkResult AgentNetwork { get; set; }
        public AdminDashboardLifecycleResult Lifecycle { get; set; }
        public AdminDashboardAttentionResult RequiresAttention { get; set; }
        public List<AdminDashboardAgentPerformanceResult> AgentPerformance { get; set; }
    }

    public class AdminDashboardSummaryResult
    {
        public decimal TotalTrustPlacement { get; set; }
        public decimal ThisMonthPlacement { get; set; }
        public decimal ActiveTrustValue { get; set; }
        public int ActiveTrustCount { get; set; }
        public decimal ApprovedCollection { get; set; }
        public decimal ThisMonthApprovedCollection { get; set; }
        public int TotalApplications { get; set; }
        public int ThisMonthApplications { get; set; }
        public int CompletedTrusts { get; set; }
        public int ThisMonthCompletedTrusts { get; set; }
        public int TotalAgents { get; set; }
        public int NewAgentsThisMonth { get; set; }
    }

    public class DashboardMonthlyPlacementResult
    {
        public int Month { get; set; }
        public string MonthName { get; set; }
        public decimal Amount { get; set; }
        public int CompletedTrusts { get; set; }
    }

    public class AdminDashboardApplicationPipelineResult
    {
        public int Total { get; set; }
        public int Draft { get; set; }
        public int PendingPayment { get; set; }
        public int PaymentApproved { get; set; }
        public int PendingAdminApproval { get; set; }
        public int SentOut { get; set; }
        public int Stamping { get; set; }
        public int Completed { get; set; }
        public int Matured { get; set; }
        public int EarlyWithdrawn { get; set; }
        public int Rejected { get; set; }
    }

    public class DashboardPlacementCollectionResult
    {
        public int Month { get; set; }
        public string MonthName { get; set; }
        public decimal PlacementAmount { get; set; }
        public decimal CollectionAmount { get; set; }
    }

    public class AdminDashboardAgentNetworkResult
    {
        public int TotalAgents { get; set; }
        public int NewAgentsThisMonth { get; set; }
        public int SellingAgents { get; set; }
        public int AgentsWithNoSales { get; set; }
    }

    public class AdminDashboardLifecycleResult
    {
        public int MaturingNext30Days { get; set; }
        public int MaturingNext90Days { get; set; }
        public int Matured { get; set; }
        public int EarlyWithdrawn { get; set; }
    }

    public class AdminDashboardAttentionResult
    {
        public int Total { get; set; }
        public int PendingPaymentApproval { get; set; }
        public int PendingAdminApproval { get; set; }
        public int MaturingNext30Days { get; set; }
        public int RejectedThisMonth { get; set; }
    }

    public class AdminDashboardAgentPerformanceResult
    {
        public long UserID { get; set; }
        public string Username { get; set; }
        public string FullName { get; set; }
        public int Ranking { get; set; }
        public string RankCode { get; set; }
        public string RankName { get; set; }
        public decimal PersonalSales { get; set; }
        public int CompletedTrusts { get; set; }
    }
}