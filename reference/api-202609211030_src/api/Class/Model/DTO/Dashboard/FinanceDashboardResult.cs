using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace API_CPX.Class.Model.DTO.Dashboard
{
    public class FinanceDashboardResult
    {
        public int Year { get; set; }
        public FinanceDashboardSummaryResult Summary { get; set; }
        public List<FinanceDashboardCollectionTrendResult> CollectionTrend { get; set; }
        public FinanceDashboardPaymentOverviewResult PaymentOverview { get; set; }
        public FinanceDashboardAttentionResult RequiresAttention { get; set; }
        public List<FinanceDashboardPaymentQueueResult> PaymentApprovalQueue { get; set; }
        public FinanceDashboardDividendWorkloadResult DividendWorkload { get; set; }
        public List<FinanceDashboardDividendQueueResult> DividendDueQueue { get; set; }
    }

    public class FinanceDashboardSummaryResult
    {
        public decimal ApprovedCollection { get; set; }
        public decimal CollectionThisMonth { get; set; }
        public int PendingPaymentApproval { get; set; }
        public decimal PendingPaymentAmount { get; set; }
        public int DividendDue { get; set; }
        public decimal DividendDueAmount { get; set; }
    }

    public class FinanceDashboardCollectionTrendResult
    {
        public int Month { get; set; }
        public string MonthName { get; set; }
        public decimal Amount { get; set; }
        public int ApprovedPayments { get; set; }
    }

    public class FinanceDashboardPaymentOverviewResult
    {
        public int Pending { get; set; }
        public int Approved { get; set; }
        public int Rejected { get; set; }
    }

    public class FinanceDashboardAttentionResult
    {
        public int Total { get; set; }
        public int PaymentPendingApproval { get; set; }
        public int DividendDue { get; set; }
        public int OverdueDividend { get; set; }
    }

    public class FinanceDashboardPaymentQueueResult
    {
        public long PaymentID { get; set; }
        public long TrustID { get; set; }
        public string TrustNo { get; set; }
        public string SettlorName { get; set; }
        public decimal SubmittedAmount { get; set; }
        public DateTime SubmittedAt { get; set; }
        public int WaitingDays { get; set; }
        public string OriginalFileName { get; set; }
    }

    public class FinanceDashboardDividendWorkloadResult
    {
        public int DueCount { get; set; }
        public decimal DueAmount { get; set; }
        public int Upcoming30DaysCount { get; set; }
        public decimal Upcoming30DaysAmount { get; set; }
        public int PaidThisMonthCount { get; set; }
        public decimal PaidThisMonthAmount { get; set; }
    }

    public class FinanceDashboardDividendQueueResult
    {
        public long DividendScheduleID { get; set; }
        public long TrustID { get; set; }
        public string TrustNo { get; set; }
        public string SettlorName { get; set; }
        public string SettlorEmail { get; set; }
        public DateTime PayoutDate { get; set; }
        public decimal Amount { get; set; }
        public int ScheduleNo { get; set; }
        public int ReturnYear { get; set; }
        public int PeriodNo { get; set; }
        public string Status { get; set; }
        public bool IsOverdue { get; set; }
    }
}