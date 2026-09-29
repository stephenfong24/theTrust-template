using System;
using System.Collections.Generic;

namespace API_CPX.Class.Model.DTO.TrustDividend
{
    public class TrustDividendListResult
    {
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalRecords { get; set; }
        public int TotalPages { get; set; }
        public TrustDividendStatistic TotalStatistics { get; set; }
        public TrustDividendStatistic SearchStatistics { get; set; }
        public List<TrustDividendListItem> Dividends { get; set; }
    }

    public class TrustDividendStatistic
    {
        public int Total { get; set; }
        public int Scheduled { get; set; }
        public int Due { get; set; }
        public int Paid { get; set; }
        public int Cancelled { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal ScheduledAmount { get; set; }
        public decimal DueAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal CancelledAmount { get; set; }
    }

    public class TrustDividendListItem
    {
        public long DividendScheduleID { get; set; }
        public long TrustApplicationID { get; set; }
        public long TrustID { get; set; }
        public string TrustNo { get; set; }
        public string ProductCode { get; set; }
        public string ProductName { get; set; }

        // ============================================================
        // Settlor
        // ============================================================

        public string SettlorName { get; set; }
        public string SettlorIdentityNo { get; set; }

        // ============================================================
        // Schedule
        // ============================================================

        public int ScheduleNo { get; set; }
        public int ReturnYear { get; set; }
        public int PeriodNo { get; set; }
        public DateTime PayoutDate { get; set; }

        // ============================================================
        // Dividend Calculation
        // ============================================================

        public decimal CalculationBasisAmount { get; set; }
        public decimal AnnualRate { get; set; }
        public decimal PeriodRate { get; set; }
        public decimal DividendAmount { get; set; }
        public decimal PayoutAmount { get; set; }
        public decimal RedepositAmount { get; set; }

        // ============================================================
        // Return
        // ============================================================

        public string ReturnOption { get; set; }
        public bool IsRedeposit { get; set; }

        // ============================================================
        // Status
        // ============================================================

        public string Status { get; set; }
        public DateTime? PaidAt { get; set; }
        public DateTime? CancelledAt { get; set; }

        // ============================================================
        // Settlor Bank
        // ============================================================

        public string SettlorBankName { get; set; }
        public string SettlorBankNameDetail { get; set; }
        public string SettlorBankAccountNumber { get; set; }
        public string SettlorBankAccountHolder { get; set; }

        // ============================================================
        // UI Permission
        // ============================================================

        public bool CanProcess { get; set; }
        public bool CanMarkPaid { get; set; }
        public bool CanCancel { get; set; }
    }
}