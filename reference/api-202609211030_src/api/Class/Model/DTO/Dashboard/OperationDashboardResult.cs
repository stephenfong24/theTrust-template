using System;
using System.Collections.Generic;

namespace API_CPX.Class.Model.DTO.Dashboard
{
    public class OperationDashboardResult
    {
        public int Year { get; set; }
        public OperationDashboardSummaryResult Summary { get; set; }
        public OperationDashboardWorkflowResult WorkflowPipeline { get; set; }
        public OperationDashboardAttentionResult RequiresAttention { get; set; }
        public OperationDashboardMaturityResult UpcomingMaturities { get; set; }
        public List<OperationDashboardMonthlyResult> ProcessingTrend { get; set; }
        public List<OperationDashboardWorkQueueResult> WorkQueue { get; set; }
    }


    public class OperationDashboardSummaryResult
    {
        public int InProcess { get; set; }
        public int ReadyForProcessing { get; set; }
        public int PendingAdminApproval { get; set; }
        public int SentOut { get; set; }
        public int Stamping { get; set; }
        public int CompletedThisMonth { get; set; }
    }


    public class OperationDashboardWorkflowResult
    {
        public int Total { get; set; }
        public int PaymentApproved { get; set; }
        public int PendingAdminApproval { get; set; }
        public int SentOut { get; set; }
        public int Stamping { get; set; }
    }


    public class OperationDashboardAttentionResult
    {
        public int Total { get; set; }
        public int PendingAdminApproval { get; set; }
        public int MaturingNext30Days { get; set; }
    }


    public class OperationDashboardMaturityResult
    {
        public int MaturingNext30Days { get; set; }
        public int MaturingNext60Days { get; set; }
        public int MaturingNext90Days { get; set; }
    }


    public class OperationDashboardMonthlyResult
    {
        public int Month { get; set; }
        public string MonthName { get; set; }
        public int CompletedApplications { get; set; }
    }


    public class OperationDashboardWorkQueueResult
    {
        public long TrustID { get; set; }
        public string SettlorName { get; set; }
        public string ProductCode { get; set; }
        public string ApplicationStatus { get; set; }
        public DateTime StageSince { get; set; }
        public int DaysInStage { get; set; }
    }
}